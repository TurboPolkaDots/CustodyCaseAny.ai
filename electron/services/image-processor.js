import sharp from 'sharp'

export async function preprocessImage(inputPath) {
  const processed = await sharp(inputPath)
    .greyscale()
    .normalize()
    .sharpen()
    .threshold(128)
    .toBuffer()

  return processed
}

export async function preprocessBuffer(buffer) {
  const processed = await sharp(buffer)
    .greyscale()
    .normalize()
    .sharpen()
    .threshold(128)
    .toBuffer()

  return processed
}

export async function pdfPageToImage(pdfBuffer, pageNum) {
  // For scanned PDFs, we need to convert pages to images
  // sharp can handle single-page PDF rendering
  try {
    const image = await sharp(pdfBuffer, { page: pageNum })
      .png()
      .toBuffer()
    return image
  } catch {
    return null
  }
}
