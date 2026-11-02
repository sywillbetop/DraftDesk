// 좌표는 모두 "화면에 보이는 페이지 기준, 좌상단 원점, pt" 이다.
export const MIN_SIZE = 10
export const PIPE_WIDTH = 6

let counter = 0
export function newId() {
  return ++counter
}

export function makeRect(a, b, color) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  if (w < MIN_SIZE || h < MIN_SIZE) return null
  return { id: newId(), type: 'rect', x, y, w, h, color }
}

export function makePipe(a, b, color, bend) {
  if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_SIZE) return null
  return { id: newId(), type: 'pipe', x1: a.x, y1: a.y, x2: b.x, y2: b.y, bend, flip: false, color }
}

export function makeText(at, text, color, size = 24) {
  return { id: newId(), type: 'text', x: at.x, y: at.y, text, size, color }
}

export function pipePoints(p) {
  const a = { x: p.x1, y: p.y1 }
  const b = { x: p.x2, y: p.y2 }
  if (!p.bend) return [a, b]
  const corner = p.flip ? { x: p.x1, y: p.y2 } : { x: p.x2, y: p.y1 }
  return [a, corner, b]
}

function distToSegment(pt, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2))
  return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy))
}

export function textBox(t) {
  let w = 0
  for (const ch of t.text) w += ch.charCodeAt(0) > 0x2e80 ? t.size : t.size * 0.6
  return { x: t.x, y: t.y, w, h: t.size * 1.2 }
}

export function hitTest(obj, pt, tolerance = 8) {
  if (obj.type === 'rect') {
    return pt.x >= obj.x - tolerance && pt.x <= obj.x + obj.w + tolerance
      && pt.y >= obj.y - tolerance && pt.y <= obj.y + obj.h + tolerance
  }
  if (obj.type === 'pipe') {
    const pts = pipePoints(obj)
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(pt, pts[i], pts[i + 1]) <= tolerance) return true
    }
    return false
  }
  const b = textBox(obj)
  return pt.x >= b.x - tolerance && pt.x <= b.x + b.w + tolerance
    && pt.y >= b.y - tolerance && pt.y <= b.y + b.h + tolerance
}

export function handlesOf(obj) {
  if (obj.type === 'pipe') {
    return [{ id: 'p1', x: obj.x1, y: obj.y1 }, { id: 'p2', x: obj.x2, y: obj.y2 }]
  }
  if (obj.type !== 'rect') return []
  const { x, y, w, h } = obj
  return [
    { id: 'nw', x, y }, { id: 'n', x: x + w / 2, y }, { id: 'ne', x: x + w, y },
    { id: 'e', x: x + w, y: y + h / 2 }, { id: 'se', x: x + w, y: y + h },
    { id: 's', x: x + w / 2, y: y + h }, { id: 'sw', x, y: y + h }, { id: 'w', x, y: y + h / 2 },
  ]
}

export function hitHandle(obj, pt, radius = 12) {
  for (const h of handlesOf(obj)) {
    if (Math.abs(pt.x - h.x) <= radius && Math.abs(pt.y - h.y) <= radius) return h.id
  }
  return null
}

export function moveObject(obj, dx, dy) {
  if (obj.type === 'pipe') {
    return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy }
  }
  return { ...obj, x: obj.x + dx, y: obj.y + dy }
}

export function resizeByHandle(obj, handleId, pt) {
  if (obj.type === 'pipe') {
    if (handleId === 'p1') return { ...obj, x1: pt.x, y1: pt.y }
    if (handleId === 'p2') return { ...obj, x2: pt.x, y2: pt.y }
    return obj
  }
  if (obj.type !== 'rect') return obj
  let left = obj.x
  let top = obj.y
  let right = obj.x + obj.w
  let bottom = obj.y + obj.h
  if (handleId.includes('w')) left = Math.min(pt.x, right - MIN_SIZE)
  if (handleId.includes('e')) right = Math.max(pt.x, left + MIN_SIZE)
  if (handleId.includes('n')) top = Math.min(pt.y, bottom - MIN_SIZE)
  if (handleId.includes('s')) bottom = Math.max(pt.y, top + MIN_SIZE)
  return { ...obj, x: left, y: top, w: right - left, h: bottom - top }
}

export function flipBend(obj) {
  return obj.type === 'pipe' && obj.bend ? { ...obj, flip: !obj.flip } : obj
}

export function setColor(obj, hex) {
  return { ...obj, color: hex }
}

export function setTextSize(obj, size) {
  return { ...obj, size: Math.max(6, Math.min(200, size)) }
}

export function viewSize(page) {
  return page.rotation === 90 || page.rotation === 270
    ? { w: page.h, h: page.w }
    : { w: page.w, h: page.h }
}

// page.w/h 는 회전 전 PDF 크기(보이는 영역), page.x/y 는 그 영역의 원점(CropBox), 입력은 화면에 보이는 좌표
export function viewToPdf(pt, page) {
  const { w, h, rotation } = page
  const ox = page.x || 0
  const oy = page.y || 0
  let p
  if (rotation === 90) p = { x: pt.y, y: pt.x }
  else if (rotation === 180) p = { x: w - pt.x, y: pt.y }
  else if (rotation === 270) p = { x: w - pt.y, y: h - pt.x }
  else p = { x: pt.x, y: h - pt.y }
  return { x: p.x + ox, y: p.y + oy }
}
