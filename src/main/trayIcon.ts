import { nativeImage, NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { TRAY_ICON_32_BASE64, TRAY_ICON_16_BASE64 } from './trayIconData'

export function createTrayNativeImage(): NativeImage {
  const possiblePaths = [
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'tray-icon@2x.png'),
    path.join(__dirname, 'tray-icon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'tray-icon@2x.png'),
    path.join(__dirname, '..', 'build', 'tray-icon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(process.cwd(), 'build', 'icon.ico'),
    path.join(process.cwd(), 'build', 'tray-icon.png'),
    path.join(process.cwd(), 'build', 'icon.ico'),
    path.join(process.cwd(), 'build', 'icon.png'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) {
        return img
      }
    }
  }

  return nativeImage.createEmpty()
  try {
    const buf = Buffer.from(TRAY_ICON_32_BASE64, 'base64')
    const img = nativeImage.createFromBuffer(buf)
    if (!img.isEmpty()) {
      return img
    }
  } catch {}

  return nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_16_BASE64}`)
}

