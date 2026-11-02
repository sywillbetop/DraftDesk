import { test, expect } from 'vitest'
import { distance, pinchScale } from '../src/lib/pinch.js'

test('두 점 사이 거리를 구한다', () => {
  expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
})

test('손가락을 두 배로 벌리면 배율도 두 배가 된다', () => {
  expect(pinchScale(1, 100, 200)).toBe(2)
})

test('손가락을 좁히면 배율이 줄어든다', () => {
  expect(pinchScale(2, 200, 100)).toBe(1)
})

test('처음 거리가 0이면 배율을 바꾸지 않는다', () => {
  expect(pinchScale(1.5, 0, 80)).toBe(1.5)
})
