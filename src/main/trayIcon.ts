import { nativeImage, NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'

export function createTrayNativeImage(): NativeImage {
  const possiblePaths = [
    path.join(__dirname, '..', 'build', 'tray-icon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.png'),
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
}

