import { test, expect } from 'vitest'
import {
  MIN_SIZE, makeRect, makePipe, makeText, pipePoints, hitTest, handlesOf, hitHandle,
  moveObject, resizeByHandle, flipBend, setTextSize, viewToPdf, viewSize,
} from '../src/lib/geometry.js'

const C = '#DC2626'

test('makeRect는 두 점을 정규화한다', () => {
  const r = makeRect({ x: 50, y: 50 }, { x: 10, y: 20 }, C)
  expect([r.x, r.y, r.w, r.h]).toEqual([10, 20, 40, 30])
})

test('너무 작은 공조는 만들어지지 않는다', () => {
  expect(makeRect({ x: 0, y: 0 }, { x: 3, y: 300 }, C)).toBeNull()
  expect(makeRect({ x: 5, y: 5 }, { x: 5, y: 5 }, C)).toBeNull()
})

test('너무 짧은 배관은 만들어지지 않는다', () => {
  expect(makePipe({ x: 0, y: 0 }, { x: 2, y: 2 }, C, false)).toBeNull()
})

test('직선 배관은 두 점이다', () => {
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, false)
  expect(pipePoints(p)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 50 }])
})

test('꺾기 배관은 기본이 가로 먼저이다', () => {
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, true)
  expect(pipePoints(p)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])
})

test('방향 바꾸기 후에는 세로 먼저이다', () => {
  const p = flipBend(makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, true))
  expect(pipePoints(p)).toEqual([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }])
})

test('flipBend는 직선 배관에는 영향이 없다', () => {
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, false)
  expect(flipBend(p)).toEqual(p)
})

test('꺾인 배관의 꺾인 부분을 맞힌다', () => {
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, true)
  expect(hitTest(p, { x: 100, y: 25 })).toBe(true)
  expect(hitTest(p, { x: 0, y: 50 })).toBe(false)
})

test('공조는 안쪽을 맞힌다', () => {
  const r = makeRect({ x: 10, y: 10 }, { x: 110, y: 60 }, C)
  expect(hitTest(r, { x: 50, y: 30 })).toBe(true)
  expect(hitTest(r, { x: 300, y: 30 })).toBe(false)
})

test('글씨는 글자 수로 추정한 영역을 맞힌다', () => {
  const t = makeText({ x: 100, y: 100 }, '덕트', C, 24)
  expect(hitTest(t, { x: 110, y: 110 })).toBe(true)
  expect(hitTest(t, { x: 400, y: 110 })).toBe(false)
})

test('손잡이 개수: 공조 8, 배관 2, 글씨 0', () => {
  expect(handlesOf(makeRect({ x: 0, y: 0 }, { x: 50, y: 50 }, C))).toHaveLength(8)
  expect(handlesOf(makePipe({ x: 0, y: 0 }, { x: 50, y: 50 }, C, false))).toHaveLength(2)
  expect(handlesOf(makeText({ x: 0, y: 0 }, '가', C))).toHaveLength(0)
})

test('hitHandle은 손잡이 근처에서 id를 돌려준다', () => {
  const r = makeRect({ x: 0, y: 0 }, { x: 100, y: 100 }, C)
  expect(hitHandle(r, { x: 102, y: 101 })).toBe('se')
  expect(hitHandle(r, { x: 50, y: 50 })).toBeNull()
})

test('공조 크기는 최소 크기 아래로 줄지 않는다', () => {
  const r = makeRect({ x: 0, y: 0 }, { x: 100, y: 100 }, C)
  const s = resizeByHandle(r, 'se', { x: 2, y: 2 })
  expect(s.w).toBe(MIN_SIZE)
  expect(s.h).toBe(MIN_SIZE)
})

test('배관 끝점을 끌면 끝점이 따라온다', () => {
  const p = makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, true)
  const q = resizeByHandle(p, 'p2', { x: 200, y: 80 })
  expect([q.x2, q.y2]).toEqual([200, 80])
})

test('moveObject는 모든 종류를 옮긴다', () => {
  const p = moveObject(makePipe({ x: 0, y: 0 }, { x: 100, y: 50 }, C, false), 5, 7)
  expect([p.x1, p.y1, p.x2, p.y2]).toEqual([5, 7, 105, 57])
})

test('글씨 크기는 6~200으로 제한된다', () => {
  const t = makeText({ x: 0, y: 0 }, '가', C)
  expect(setTextSize(t, 1).size).toBe(6)
  expect(setTextSize(t, 999).size).toBe(200)
})

const page = (rotation) => ({ w: 200, h: 100, rotation })

test('회전 90도면 보이는 크기가 맞바뀐다', () => {
  expect(viewSize(page(90))).toEqual({ w: 100, h: 200 })
  expect(viewSize(page(0))).toEqual({ w: 200, h: 100 })
})

test('viewToPdf: 회전 없음', () => {
  expect(viewToPdf({ x: 10, y: 20 }, page(0))).toEqual({ x: 10, y: 80 })
})

test('viewToPdf: 90도', () => {
  expect(viewToPdf({ x: 0, y: 0 }, page(90))).toEqual({ x: 0, y: 0 })
  expect(viewToPdf({ x: 100, y: 0 }, page(90))).toEqual({ x: 0, y: 100 })
})

test('viewToPdf: 270도', () => {
  expect(viewToPdf({ x: 0, y: 0 }, page(270))).toEqual({ x: 200, y: 100 })
})

test('viewToPdf: 180도', () => {
  expect(viewToPdf({ x: 0, y: 0 }, page(180))).toEqual({ x: 200, y: 0 })
})

test.each([0, 90, 180, 270])('viewToPdf: 회전 %i도에서 보이는 네 모서리가 PDF 범위 안이다', (rot) => {
  const pg = page(rot)
  const v = viewSize(pg)
  for (const pt of [{ x: 0, y: 0 }, { x: v.w, y: 0 }, { x: 0, y: v.h }, { x: v.w, y: v.h }]) {
    const p = viewToPdf(pt, pg)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(200)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(100)
  }
})

test('viewToPdf: CropBox 원점이 있으면 그만큼 더해진다', () => {
  const pg = { w: 200, h: 100, x: 36, y: 20, rotation: 0 }
  expect(viewToPdf({ x: 10, y: 20 }, pg)).toEqual({ x: 46, y: 100 })
})

test('viewToPdf: 90도 + CropBox 원점', () => {
  const pg = { w: 200, h: 100, x: 36, y: 20, rotation: 90 }
  expect(viewToPdf({ x: 100, y: 0 }, pg)).toEqual({ x: 36, y: 120 })
})
