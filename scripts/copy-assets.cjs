const fs = require('fs')
const path = require('path')

const out = path.join(__dirname, '..', 'dist-main')
fs.mkdirSync(out, { recursive: true })

const files = ['tray-icon.png', 'tray-icon@2x.png', 'icon.ico', 'icon.png']
for (const f of files) {
  const src = path.join(__dirname, '..', 'build', f)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f))
  }
}
console.log('✓ Icon assets copied to dist-main')
