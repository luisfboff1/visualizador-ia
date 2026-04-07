/**
 * Generates build/icon.ico with 16, 32, 48, 256 px sizes.
 * Uses only Node built-ins (zlib) — no dependencies.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = (crc >>> 8) ^ t[(crc ^ b) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size) {
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA

  const half = size / 2
  const rows = []
  for (let y = 0; y < size; y++) {
    rows.push(0) // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - half + 0.5
      const dy = y - half + 0.5
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist > half - 0.5) {
        rows.push(0, 0, 0, 0) // transparent
      } else {
        const t = 1 - dist / half
        rows.push(
          Math.min(255, Math.round(59  + t * 80)),
          Math.min(255, Math.round(130 + t * 60)),
          Math.min(255, Math.round(246)),
          255
        )
      }
    }
  }

  const idat = chunk('IDAT', zlib.deflateSync(Buffer.from(rows)))
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))])
}

function makeIco(sizes) {
  const pngs = sizes.map(s => makePng(s))
  const count = sizes.length

  // ICO header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: ICO
  header.writeUInt16LE(count, 4)

  // Directory entries: 16 bytes each
  const dirSize = count * 16
  let offset = 6 + dirSize
  const dirs = []
  for (let i = 0; i < count; i++) {
    const size = sizes[i]
    const png = pngs[i]
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size  // width (0 = 256)
    entry[1] = size >= 256 ? 0 : size  // height
    entry[2] = 0   // color count
    entry[3] = 0   // reserved
    entry.writeUInt16LE(1, 4)          // planes
    entry.writeUInt16LE(32, 6)         // bit count
    entry.writeUInt32LE(png.length, 8) // bytes in resource
    entry.writeUInt32LE(offset, 12)    // offset
    dirs.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...dirs, ...pngs])
}

const outDir = path.join(__dirname, '..', 'build')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const ico = makeIco([16, 32, 48, 256])
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico)
console.log(`✓ build/icon.ico gerado (${ico.length} bytes)`)
