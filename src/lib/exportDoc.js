import { PDFDocument, rgb, degrees, LineCapStyle } from 'pdf-lib'
import { PIPE_WIDTH, pipePoints, viewToPdf } from './geometry.js'
import { RECT_STROKE, TEXT_FONT, drawObject } from './draw.js'
import { editedName } from './fileName.js'

const TEXT_RATIO = 3

function hexToRgb(hex) {
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  )
}

// 한글 폰트를 파일에 넣지 않고 canvas 로 그림을 만들어 얹는다(스펙 6장이 허용한 선택)
export async function renderTextPng(obj) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = `${obj.size * TEXT_RATIO}px ${TEXT_FONT}`
  ctx.font = font
  const w = Math.max(1, Math.ceil(ctx.measureText(obj.text).width))
  const h = Math.ceil(obj.size * 1.2 * TEXT_RATIO)
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.font = font
  g.fillStyle = obj.color
  g.textBaseline = 'top'
  g.fillText(obj.text, 0, 0)
  const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'))
  return { bytes: new Uint8Array(await blob.arrayBuffer()), wPt: w / TEXT_RATIO, hPt: h / TEXT_RATIO }
}

async function drawObjects(doc, page, objects, renderText) {
  const { width, height } = page.getSize()
  const rotation = ((page.getRotation().angle % 360) + 360) % 360
  const info = { w: width, h: height, rotation }
  const toPdf = (p) => viewToPdf(p, info)
  const line = (a, b, thickness, color) =>
    page.drawLine({ start: toPdf(a), end: toPdf(b), thickness, color, lineCap: LineCapStyle.Round })

  for (const o of objects) {
    const color = hexToRgb(o.color)
    if (o.type === 'rect') {
      const c = [{ x: o.x, y: o.y }, { x: o.x + o.w, y: o.y }, { x: o.x + o.w, y: o.y + o.h }, { x: o.x, y: o.y + o.h }]
      for (let i = 0; i < 4; i++) line(c[i], c[(i + 1) % 4], RECT_STROKE, color)
    } else if (o.type === 'pipe') {
      const pts = pipePoints(o)
      for (let i = 0; i < pts.length - 1; i++) line(pts[i], pts[i + 1], PIPE_WIDTH, color)
    } else {
      const t = await renderText(o)
      const img = await doc.embedPng(t.bytes)
      const at = toPdf({ x: o.x, y: o.y + t.hPt }) // 그림의 왼쪽 아래 모서리
      page.drawImage(img, { x: at.x, y: at.y, width: t.wPt, height: t.hPt, rotate: degrees(rotation) })
    }
  }
}

async function imageForPdf(source) {
  if (source.mime === 'image/png') return { png: true, bytes: source.bytes }
  if (source.mime === 'image/jpeg') return { png: false, bytes: source.bytes }
  // 그 밖의 형식(webp, gif)은 canvas 를 거쳐 PNG 로 바꾼다
  const r = await source.renderPage(0, 1)
  const blob = await new Promise((resolve) => r.canvas.toBlob(resolve, 'image/png'))
  return { png: true, bytes: new Uint8Array(await blob.arrayBuffer()) }
}

export async function exportPdf({ source, objectsByPage, pages, renderText = renderTextPng }) {
  const keep = [...pages].sort((a, b) => a - b)
  let doc
  if (source.kind === 'pdf') {
    doc = await PDFDocument.load(source.bytes)
    for (const i of keep) await drawObjects(doc, doc.getPage(i), objectsByPage[i] || [], renderText)
    for (let i = doc.getPageCount() - 1; i >= 0; i--) {
      if (!keep.includes(i)) doc.removePage(i)
    }
  } else {
    doc = await PDFDocument.create()
    const img = await imageForPdf(source)
    const embedded = img.png ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes)
    const page = doc.addPage([embedded.width, embedded.height])
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
    await drawObjects(doc, page, objectsByPage[0] || [], renderText)
  }
  return new Uint8Array(await doc.save())
}

export async function exportPng({ source, objects, pageIndex }) {
  const px = source.kind === 'pdf' ? 2 : 1
  const r = await source.renderPage(pageIndex, px)
  const c = document.createElement('canvas')
  c.width = r.canvas.width
  c.height = r.canvas.height
  const ctx = c.getContext('2d')
  ctx.drawImage(r.canvas, 0, 0)
  for (const o of objects) drawObject(ctx, o, px)
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function runSave(
  { source, objectsByPage, scope, format, currentPage, modified },
  deps = { download: downloadBlob, exportPng },
) {
  const all = Array.from({ length: source.pageCount }, (_, i) => i)
  const pages = scope === 'all' ? all : scope === 'modified' ? modified : [currentPage]
  const numbered = scope === 'one' && source.pageCount > 1 ? currentPage + 1 : undefined
  let blob
  let filename
  if (scope === 'one' && format === 'png') {
    blob = await deps.exportPng({ source, objects: objectsByPage[currentPage] || [], pageIndex: currentPage })
    filename = editedName(source.name, 'png', numbered)
  } else {
    const bytes = await exportPdf({ source, objectsByPage, pages })
    blob = new Blob([bytes], { type: 'application/pdf' })
    filename = editedName(source.name, 'pdf', numbered)
  }
  deps.download(blob, filename)
  return { filename }
}
