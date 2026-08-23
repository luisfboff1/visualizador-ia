const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const outDir = path.join(__dirname, '..', 'build')
const srcImage = path.join(__dirname, '..', 'docs', 'icon_realistic_transparent.png')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

if (fs.existsSync(srcImage)) {
  const pyCode = [
    "from PIL import Image",
    "import os",
    `img = Image.open(r'${srcImage}').convert('RGBA')`,
    "os.makedirs('build', exist_ok=True)",
    "os.makedirs('public', exist_ok=True)",
    "img.resize((512, 512), Image.Resampling.LANCZOS).save('build/icon.png')",
    "img.resize((256, 256), Image.Resampling.LANCZOS).save('public/icon.png')",
    "img.resize((32, 32), Image.Resampling.LANCZOS).save('public/favicon.ico')",
    "img.resize((16, 16), Image.Resampling.LANCZOS).save('build/tray-icon.png')",
    "img.resize((32, 32), Image.Resampling.LANCZOS).save('build/tray-icon@2x.png')",
    "sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]",
    "img.save('build/icon.ico', format='ICO', sizes=sizes)",
    "img.save('public/icon.ico', format='ICO', sizes=sizes)"
  ].join('\n')

  const res = spawnSync('python', ['-c', pyCode], { stdio: 'inherit' })
  if (res.status === 0) {
    console.log('✓ build/icon.ico e ícones gerados com sucesso a partir de docs/icon_realistic_transparent.png')
    process.exit(0)
  }
}


