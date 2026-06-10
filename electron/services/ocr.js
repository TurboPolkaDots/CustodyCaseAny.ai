import { createWorker } from 'tesseract.js'

let worker = null

async function getWorker() {
  if (!worker) {
    worker = await createWorker('eng')
  }
  return worker
}

export async function ocrImage(imagePath, onProgress) {
  const w = await getWorker()

  if (onProgress) {
    // Tesseract.js v5 progress is available via logger
  }

  const { data } = await w.recognize(imagePath)
  return {
    text: data.text,
    confidence: data.confidence
  }
}

export async function ocrBuffer(imageBuffer, onProgress) {
  const w = await getWorker()
  const { data } = await w.recognize(imageBuffer)
  return {
    text: data.text,
    confidence: data.confidence
  }
}

export async function terminateOcr() {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
