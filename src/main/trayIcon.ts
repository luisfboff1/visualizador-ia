import { nativeImage, NativeImage } from 'electron'
import zlib from 'zlib'

function crc32(buf: Buffer): number {
  const table: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size: number, drawPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 6  // RGBA

  const rawRows: number[] = []
  for (let y = 0; y < size; y++) {
    rawRows.push(0) // filter: None
    for (let x = 0; x < size; x++) {
      rawRows.push(...drawPixel(x, y))
    }
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(Buffer.from(rawRows)))
  return Buffer.concat([sig, makeChunk('IHDR', ihdrData), idat, makeChunk('IEND', Buffer.alloc(0))])
}

export function createTrayNativeImage(): NativeImage {
  const size = 22
  const half = size / 2

  const png = makePng(size, (x, y) => {
    const dx = x - half + 0.5
    const dy = y - half + 0.5
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > half - 0.5) return [0, 0, 0, 0]  // transparent outside circle

    // Inner "AI" feel: bright blue gradient dot with lighter center
    const t = 1 - dist / half
    const r = Math.round(59  + t * 60)
    const g = Math.round(130 + t * 50)
    const b = Math.round(246 + t * 9)
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b), 255]
  })

  return nativeImage.createFromBuffer(png)
}
