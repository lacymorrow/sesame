/**
 * Generate a simple tray icon for Sesame.
 * Run: npx tsx scripts/generate-tray-icon.ts
 * 
 * Creates a 22x22 PNG with a key/lock symbol.
 * For macOS, tray icons should be 22x22 (or 44x44 @2x) template images.
 */

import { writeFileSync } from 'node:fs'

// Minimal 16x16 1-bit PNG of a lock icon, base64 encoded
// We'll create it programmatically using raw PNG bytes

function createPng(width: number, height: number, pixels: number[][]): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 4  // color type: grayscale + alpha
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  
  // IDAT - raw pixel data with filter bytes
  const rawData: number[] = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter: none
    for (let x = 0; x < width; x++) {
      const val = pixels[y][x]
      rawData.push(val > 0 ? 255 : 0)   // gray
      rawData.push(val > 0 ? 255 : 0)   // alpha
    }
  }
  
  // Use zlib to compress
  const zlib = require('node:zlib')
  const compressed = zlib.deflateSync(Buffer.from(rawData))
  
  function chunk(type: string, data: Buffer): Buffer {
    const buf = Buffer.alloc(4 + 4 + data.length + 4)
    buf.writeUInt32BE(data.length, 0)
    buf.write(type, 4)
    data.copy(buf, 8)
    // CRC32
    const crcData = Buffer.concat([Buffer.from(type), data])
    const crc = crc32(crcData)
    buf.writeUInt32BE(crc, 8 + data.length)
    return buf
  }
  
  function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
  
  const ihdrChunk = chunk('IHDR', ihdr)
  const idatChunk = chunk('IDAT', compressed)
  const iendChunk = chunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

// 16x16 lock icon pattern
// 1 = filled, 0 = transparent
const lock16 = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

const png = createPng(16, 16, lock16)
writeFileSync('resources/icons/trayTemplate.png', png)
console.log('Generated resources/icons/trayTemplate.png')

// Also create @2x version (32x32, just scale up)
const lock32: number[][] = []
for (const row of lock16) {
  const scaled = row.flatMap(v => [v, v])
  lock32.push(scaled)
  lock32.push([...scaled])
}

const png2x = createPng(32, 32, lock32)
writeFileSync('resources/icons/trayTemplate@2x.png', png2x)
console.log('Generated resources/icons/trayTemplate@2x.png')
