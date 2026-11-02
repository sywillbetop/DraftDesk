import { PIPE_WIDTH, pipePoints, handlesOf, textBox } from './geometry.js'

export const RECT_STROKE = 4
export const TEXT_FONT = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
export const HANDLE_PX = 16
export const TEXT_PAD_RATIO = 0.15
const SELECT_BLUE = '#2563EB'

// scale: pt -> 캔버스 픽셀
export function drawObject(ctx, obj, scale) {
  ctx.save()
  if (obj.type === 'rect') {
    ctx.fillStyle = obj.color
    ctx.fillRect(obj.x * scale, obj.y * scale, obj.w * scale, obj.h * scale)
    ctx.strokeStyle = obj.color
    ctx.lineWidth = RECT_STROKE * scale
    ctx.strokeRect(obj.x * scale, obj.y * scale, obj.w * scale, obj.h * scale)
  } else if (obj.type === 'pipe') {
    const pts = pipePoints(obj)
    ctx.strokeStyle = obj.color
    ctx.lineWidth = PIPE_WIDTH * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x * scale, p.y * scale) : ctx.moveTo(p.x * scale, p.y * scale)))
    ctx.stroke()
  } else {
    ctx.font = `${obj.size * scale}px ${TEXT_FONT}`
    ctx.textBaseline = 'top'
    // 도면 선에 묻히지 않도록 글자 뒤에 흰 배경을 깐다
    const pad = obj.size * TEXT_PAD_RATIO * scale
    const w = ctx.measureText(obj.text).width
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(obj.x * scale - pad, obj.y * scale - pad, w + pad * 2, obj.size * 1.2 * scale + pad * 2)
    ctx.fillStyle = obj.color
    ctx.fillText(obj.text, obj.x * scale, obj.y * scale)
  }
  ctx.restore()
}

// handlePx: 손잡이 지름(캔버스 픽셀)
export function drawSelection(ctx, obj, scale, handlePx = HANDLE_PX) {
  ctx.save()
  // 잡혔다는 느낌: 물체 둘레를 굵은 반투명 파란색으로 감싼다
  const halo = 'rgba(37, 99, 235, 0.35)'
  ctx.strokeStyle = halo
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (obj.type === 'pipe') {
    ctx.lineWidth = PIPE_WIDTH * scale + handlePx
    ctx.beginPath()
    pipePoints(obj).forEach((p, i) => (i ? ctx.lineTo(p.x * scale, p.y * scale) : ctx.moveTo(p.x * scale, p.y * scale)))
    ctx.stroke()
  } else {
    const b = obj.type === 'rect' ? obj : textBox(obj)
    ctx.lineWidth = handlePx * 0.6
    ctx.strokeRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale)
  }
  ctx.strokeStyle = SELECT_BLUE
  ctx.fillStyle = '#fff'
  ctx.lineWidth = 3
  for (const h of handlesOf(obj)) {
    ctx.beginPath()
    ctx.arc(h.x * scale, h.y * scale, handlePx / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}
