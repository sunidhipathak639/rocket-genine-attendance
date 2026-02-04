import sharp from 'sharp'
import path from 'path'

const publicDir = path.join(process.cwd(), 'public')
const inputFile = path.join(publicDir, 'rocket-genie-logo.webp')
const outputFileIco = path.join(publicDir, 'favicon.ico')
const outputFilePng = path.join(publicDir, 'icon.png') // Helper for other uses

async function generateFavicons() {
  try {
    console.log('Generating favicons from', inputFile)

    // Create standard 32x32 favicon
    await sharp(inputFile).resize(32, 32).png().toFile(outputFileIco)

    console.log('Updated public/favicon.ico')

    // Create a higher res icon too
    await sharp(inputFile).resize(192, 192).png().toFile(outputFilePng)

    console.log('Created public/icon.png')
  } catch (error) {
    console.error('Error generating favicons:', error)
  }
}

generateFavicons()
