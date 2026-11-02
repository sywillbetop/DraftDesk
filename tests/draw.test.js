import { test, expect } from 'vitest'
import { drawObject, drawSelection, TEXT_PAD_RATIO } from '../src/lib/draw.js'
import { makeText, makePipe } from '../src/lib/geometry.js'

function recorder() {
  const calls = []
  const ctx = new Proxy({}, {
    get: (_, name) => {
      if (name === 'calls') return calls
      if (name === 'measureText') return (t) => ({ width: t.length * 10 })
      return (...args) => calls.push([name, ...args])
    },
    set: (_, name, value) => { calls.push(['set:' + name, value]); return true },
  })
  return ctx
}

test('글씨는 글자 뒤에 흰 배경을 먼저 깔고 글자를 쓴다', () => {
  const ctx = recorder()
  const t = makeText({ x: 10, y: 20 }, '덕트', '#DC2626')
  drawObject(ctx, t, 1)
  const names = ctx.calls.map((c) => c[0])
  expect(names.indexOf('fillRect')).toBeGreaterThanOrEqual(0)
  expect(names.indexOf('fillRect')).toBeLessThan(names.indexOf('fillText'))
  expect(ctx.calls.some((c) => c[0] === 'set:fillStyle' && c[1] === '#ffffff')).toBe(true)
})

test('배경은 글자 폭(측정값)에 여백을 더한 크기다', () => {
  const ctx = recorder()
  const t = makeText({ x: 10, y: 20 }, '덕트', '#DC2626')
  drawObject(ctx, t, 1)
  const [, x, y, w] = ctx.calls.find((c) => c[0] === 'fillRect')
  const pad = t.size * TEXT_PAD_RATIO
  expect(x).toBeCloseTo(10 - pad)
  expect(y).toBeCloseTo(20 - pad)
  expect(w).toBeCloseTo(20 + pad * 2)
})

test('선택한 배관은 굵은 반투명 테두리로 잡힌 느낌을 준다', () => {
  const ctx = recorder()
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 0 }, '#DC2626', false)
  drawSelection(ctx, p, 1, 28)
  const widths = ctx.calls.filter((c) => c[0] === 'set:lineWidth').map((c) => c[1])
  expect(Math.max(...widths)).toBeGreaterThan(12)
})
