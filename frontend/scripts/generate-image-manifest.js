import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Determine current directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Source directory containing the example images
const imagesDir = path.join(__dirname, '../public/images/example_images')
// Output file for the generated manifest
const outFile = path.join(__dirname, '../src/utils/imageManifest.ts')

function generateImageManifest() {
  if (!fs.existsSync(imagesDir)) {
    console.warn(`Images directory not found: ${imagesDir}`)
    return
  }
  // Read all image files (png, jpg, jpeg, webp, svg)
  const files = fs.readdirSync(imagesDir).filter(file => /\.(png|jpe?g|webp|svg)$/i.test(file))
  const paths = files.map(file => `/images/example_images/${file}`)

  const content = `export const exampleImages = ${JSON.stringify(paths, null, 2)};\n` 
  fs.writeFileSync(outFile, content)
  console.log(`Generated image manifest with ${paths.length} entries: ${outFile}`)
}

generateImageManifest() 