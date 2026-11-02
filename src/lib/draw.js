import { PIPE_WIDTH, pipePoints, handlesOf, textBox } from './geometry.js'

export const RECT_STROKE = 4
export const TEXT_FONT = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
export const HANDLE_PX = 16

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
    ctx.fillStyle = obj.color
    ctx.font = `${obj.size * scale}px ${TEXT_FONT}`
    ctx.textBaseline = 'top'
    ctx.fillText(obj.text, obj.x * scale, obj.y * scale)
  }
  ctx.restore()
}

export function drawSelection(ctx, obj, scale) {
  ctx.save()
  ctx.strokeStyle = '#2563EB'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  if (obj.type === 'rect') {
    ctx.strokeRect(obj.x * scale - 4, obj.y * scale - 4, obj.w * scale + 8, obj.h * scale + 8)
  } else if (obj.type === 'text') {
    const b = textBox(obj)
    ctx.strokeRect(b.x * scale - 4, b.y * scale - 4, b.w * scale + 8, b.h * scale + 8)
  }
  ctx.setLineDash([])
  ctx.fillStyle = '#fff'
  for (const h of handlesOf(obj)) {
    const x = h.x * scale - HANDLE_PX / 2
    const y = h.y * scale - HANDLE_PX / 2
    ctx.fillRect(x, y, HANDLE_PX, HANDLE_PX)
    ctx.strokeRect(x, y, HANDLE_PX, HANDLE_PX)
  }
  ctx.restore()
}
