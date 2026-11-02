import { test, expect, beforeEach } from 'vitest'
import { PALETTE, loadColor, saveColor } from '../src/lib/palette.js'

beforeEach(() => localStorage.clear())

test('팔레트는 8색이다', () => {
  expect(PALETTE).toHaveLength(8)
})

test('저장한 색을 기억한다', () => {
  saveColor(PALETTE[3])
  expect(loadColor()).toBe(PALETTE[3])
})

test('잘못된 저장값이면 첫 색을 쓴다', () => {
  localStorage.setItem('draftdesk.color', '#123456')
  expect(loadColor()).toBe(PALETTE[0])
})
