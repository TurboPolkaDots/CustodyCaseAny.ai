import pdfParse from 'pdf-parse'
import { readFileSync } from 'fs'

export async function parsePdf(filePath) {
  const buffer = readFileSync(filePath)
  const data = await pdfParse(buffer)

  const text = data.text || ''
  const pageCount = data.numpages || 1

  // Detect scanned PDF: if average chars per page is very low
  const charsPerPage = text.length / pageCount
  const isScanned = charsPerPage < 100

  return {
    text: isScanned ? '' : text,
    pageCount,
    isScanned,
    metadata: data.info || {}
  }
}
