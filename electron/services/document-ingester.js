import { readFileSync } from 'fs'
import { extname } from 'path'
import { parsePdf } from './pdf-parser.js'
import { ocrImage, ocrBuffer } from './ocr.js'
import { preprocessImage, preprocessBuffer, pdfPageToImage } from './image-processor.js'
import { aiProvider } from './ai-provider.js'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.bmp']
const CLASSIFICATION_MODEL = 'llama3.2:3b'

export class DocumentIngester {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
  }

  // Full ingest — register + process in one call (used by file watcher)
  async ingest(fileInfo) {
    const reg = this.register(fileInfo)
    if (!reg.success) return reg
    return await this.process(reg.id)
  }

  // Fast register — just saves to DB, no processing
  register(fileInfo) {
    const { name, path, size, type } = fileInfo
    const ext = extname(name).toLowerCase()
    const fileType = this._detectFileType(ext, type)

    const docId = this.db.insertDocument({
      file_name: name,
      file_path: path,
      file_type: fileType,
      file_size: size,
      mime_type: type
    })

    return { id: docId, success: true }
  }

  // Heavy processing — text extraction + AI classification
  async process(docId) {
    const doc = this.db.getDocument(docId)
    if (!doc) return { id: docId, success: false, error: 'Document not found' }

    const ext = extname(doc.file_name).toLowerCase()

    this.sendProgress({ documentId: docId, status: 'extracting', stage: 'Extracting text...' })

    try {
      // Extract text
      let extractedText = ''
      let ocrNeeded = false
      const filePath = doc.file_path

      if (ext === '.pdf') {
        const pdfResult = await parsePdf(filePath)
        if (pdfResult.isScanned) {
          ocrNeeded = true
          extractedText = await this._ocrPdfPages(filePath, pdfResult.pageCount)
        } else {
          extractedText = pdfResult.text
        }
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        ocrNeeded = true
        const preprocessed = await preprocessImage(filePath)
        const ocrResult = await ocrBuffer(preprocessed)
        extractedText = ocrResult.text
      } else if (ext === '.doc') {
        const extractor = new WordExtractor()
        const extracted = await extractor.extract(filePath)
        extractedText = extracted.getBody()
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath })
        extractedText = result.value
      } else if (['.txt', '.csv'].includes(ext)) {
        extractedText = readFileSync(filePath, 'utf-8')
      } else {
        extractedText = readFileSync(filePath, 'utf-8')
      }

      this.db.updateDocument(docId, {
        extracted_text: extractedText,
        ocr_needed: ocrNeeded ? 1 : 0,
        processing_status: 'classifying'
      })

      this.sendProgress({ documentId: docId, status: 'classifying', stage: 'Classifying document...' })

      // Classify with Ollama
      let classification = 'OTHER'
      let confidence = 0
      let metadata = null
      let summary = null

      try {
        const connected = await aiProvider.isConnected()
        if (connected && extractedText.trim().length > 0) {
          const classResult = await this._classifyDocument(extractedText)
          classification = classResult.classification || 'OTHER'
          confidence = classResult.confidence || 0

          const metaResult = await this._extractMetadata(extractedText, classification)
          metadata = metaResult
          summary = metaResult?.summary || null
        }
      } catch (error) {
        console.error('Classification failed:', error)
      }

      this.db.updateDocument(docId, {
        classification,
        classification_confidence: confidence,
        metadata_json: metadata ? JSON.stringify(metadata) : null,
        summary,
        processing_status: 'complete'
      })

      this.sendProgress({ documentId: docId, status: 'complete', stage: 'Done' })

      return { id: docId, success: true }
    } catch (error) {
      this.db.updateDocument(docId, {
        processing_status: 'error',
        error_message: error.message
      })
      this.sendProgress({ documentId: docId, status: 'error', stage: error.message })
      return { id: docId, success: false, error: error.message }
    }
  }

  async _ocrPdfPages(pdfPath, pageCount) {
    const buffer = readFileSync(pdfPath)
    const texts = []

    for (let i = 0; i < pageCount; i++) {
      try {
        const pageImage = await pdfPageToImage(buffer, i)
        if (pageImage) {
          const preprocessed = await preprocessBuffer(pageImage)
          const ocrResult = await ocrBuffer(preprocessed)
          texts.push(ocrResult.text)
        }
      } catch (error) {
        console.error(`OCR failed for page ${i}:`, error)
      }
    }

    return texts.join('\n\n--- Page Break ---\n\n')
  }

  async _classifyDocument(text) {
    const truncated = text.substring(0, 3000)
    const result = await aiProvider.chatJson(CLASSIFICATION_MODEL, [
      {
        role: 'system',
        content: `You are a document classifier for custody/family law documents. Classify the document into exactly one category.

Categories: OFW_MESSAGE, EMAIL, COURT_FILING, FINANCIAL_RECORD, MEDICAL_RECORD, SCHOOL_RECORD, PHOTO_EVIDENCE, TEXT_MESSAGE, LEGAL_CORRESPONDENCE, PARENTING_PLAN, OTHER

Respond with JSON: {"classification": "CATEGORY", "confidence": 0.0-1.0}`
      },
      {
        role: 'user',
        content: `Classify this document:\n\n${truncated}`
      }
    ])

    return result
  }

  async _extractMetadata(text, classification) {
    const truncated = text.substring(0, 4000)
    const result = await aiProvider.chatJson(CLASSIFICATION_MODEL, [
      {
        role: 'system',
        content: `Extract metadata from this custody-related document. Respond with JSON:
{
  "dates": ["YYYY-MM-DD", ...],
  "people": ["Name", ...],
  "topics": ["topic", ...],
  "summary": "1-2 sentence summary"
}`
      },
      {
        role: 'user',
        content: `Document type: ${classification}\n\n${truncated}`
      }
    ])

    return result
  }

  _detectFileType(ext, mimeType) {
    const map = {
      '.pdf': 'PDF',
      '.jpg': 'Image', '.jpeg': 'Image', '.png': 'Image',
      '.tiff': 'Image', '.tif': 'Image', '.webp': 'Image',
      '.docx': 'DOCX', '.doc': 'DOC',
      '.xlsx': 'XLSX', '.csv': 'CSV',
      '.txt': 'Text', '.eml': 'Email'
    }
    return map[ext] || 'Unknown'
  }
}
