const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const outDir = path.join(__dirname, '..', 'build')
const srcImage = path.join(__dirname, '..', 'docs', 'icon_realistic_transparent.png')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

if (fs.existsSync(srcImage)) {
  const pyCode = [
    "from PIL import Image, ImageEnhance",
    "import os",
    `img = Image.open(r'${srcImage}').convert('RGBA')`,
    "os.makedirs('build', exist_ok=True)",
    "os.makedirs('public', exist_ok=True)",
    "bbox = img.getbbox()",
    "pad = int(min(bbox[2]-bbox[0], bbox[3]-bbox[1]) * 0.02)",
    "cropped = img.crop((max(0, bbox[0]-pad), max(0, bbox[1]-pad), min(img.width, bbox[2]+pad), min(img.height, bbox[3]+pad)))",
    "rgb = cropped.convert('RGB')",
    "rgb_bright = ImageEnhance.Brightness(rgb).enhance(1.15)",
    "rgb_con = ImageEnhance.Contrast(rgb_bright).enhance(1.2)",
    "final_icon = rgb_con.convert('RGBA')",
    "final_icon.putalpha(cropped.split()[3])",
    "final_icon.resize((512, 512), Image.Resampling.LANCZOS).save('build/icon.png')",
    "final_icon.resize((256, 256), Image.Resampling.LANCZOS).save('public/icon.png')",
    "final_icon.resize((32, 32), Image.Resampling.LANCZOS).save('public/favicon.ico')",
    "final_icon.resize((16, 16), Image.Resampling.LANCZOS).save('build/tray-icon.png')",
    "final_icon.resize((32, 32), Image.Resampling.LANCZOS).save('build/tray-icon@2x.png')",
    "sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]",
    "final_icon.save('build/icon.ico', format='ICO', sizes=sizes)",
    "final_icon.save('public/icon.ico', format='ICO', sizes=sizes)"
  ].join('\n')

  const res = spawnSync('python', ['-c', pyCode], { stdio: 'inherit' })
  if (res.status === 0) {
    console.log('✓ build/icon.ico e ícones gerados com sucesso a partir de docs/icon_realistic_transparent.png')
    process.exit(0)
  }
}


