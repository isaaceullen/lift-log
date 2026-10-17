import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

function barbell(x, y, width, color) {
  const plateW = width * 0.16
  const plateH = width * 0.42
  const innerW = width * 0.07
  const innerH = width * 0.24
  const barH = width * 0.07
  const left = x
  const top = y - plateH / 2
  const barY = y - barH / 2
  return `
    <g fill="${color}">
      <rect x="${left}" y="${top}" width="${plateW}" height="${plateH}" rx="${plateW * 0.18}"/>
      <rect x="${left + plateW}" y="${y - innerH / 2}" width="${innerW}" height="${innerH}"/>
      <rect x="${left + plateW + innerW}" y="${barY}" width="${width - (plateW + innerW) * 2}" height="${barH}" rx="${barH / 2}"/>
      <rect x="${left + width - plateW - innerW}" y="${y - innerH / 2}" width="${innerW}" height="${innerH}"/>
      <rect x="${left + width - plateW}" y="${top}" width="${plateW}" height="${plateH}" rx="${plateW * 0.18}"/>
    </g>
  `
}

function iconSvg({ size, maskable = false, rounded = false }) {
  const plate = maskable ? size * 0.62 : size
  const offset = (size - plate) / 2
  const radius = rounded ? size * 0.22 : maskable ? plate * 0.22 : 0
  const background = maskable ? '#07080B' : '#D6FF3C'
  const mark = maskable ? '#D6FF3C' : '#14180A'
  const barWidth = plate * 0.62
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${maskable ? '#07080B' : '#D6FF3C'}"/>
  <rect x="${offset}" y="${offset}" width="${plate}" height="${plate}" rx="${radius}" fill="${background}"/>
  ${barbell((size - barWidth) / 2, size / 2, barWidth, mark)}
</svg>`
}

function splashSvg(width, height) {
  const mark = Math.round(Math.min(width, height) * 0.28)
  const x = (width - mark) / 2
  const y = height * 0.4
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#07080B"/>
  <rect x="${x}" y="${y}" width="${mark}" height="${mark}" rx="${mark * 0.22}" fill="#D6FF3C"/>
  ${barbell(x + mark * 0.16, y + mark / 2, mark * 0.68, '#14180A')}
  <text x="${width / 2}" y="${y + mark + height * 0.08}" text-anchor="middle" fill="#F4F6F8" font-family="Arial, sans-serif" font-size="${Math.round(width * 0.075)}" font-weight="700" letter-spacing="${Math.round(width * 0.01)}">FORJA</text>
  <text x="${width / 2}" y="${y + mark + height * 0.115}" text-anchor="middle" fill="#9AA3B5" font-family="Arial, sans-serif" font-size="${Math.round(width * 0.032)}">treino de academia</text>
</svg>`
}

function writePng(filename, svg) {
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng()
  const target = join(publicDir, filename)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, png)
}

writePng('pwa-192.png', iconSvg({ size: 192 }))
writePng('pwa-512.png', iconSvg({ size: 512 }))
writePng('apple-touch-icon.png', iconSvg({ size: 180 }))
writePng('pwa-maskable-512.png', iconSvg({ size: 512, maskable: true, rounded: true }))

for (const [width, height] of [
  [1320, 2868],
  [1206, 2622],
  [1290, 2796],
  [1179, 2556],
  [1284, 2778],
  [1170, 2532],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
]) {
  writePng(`splash/${width}x${height}.png`, splashSvg(width, height))
}

console.log('icons ready')
