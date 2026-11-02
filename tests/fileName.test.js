import { test, expect } from 'vitest'
import { editedName } from '../src/lib/fileName.js'

test('한글 이름에 _편집을 붙인다', () => {
  expect(editedName('3층 도면.pdf', 'pdf')).toBe('3층 도면_편집.pdf')
})

test('점이 여러 개여도 마지막 확장자만 바꾼다', () => {
  expect(editedName('도면.v2.final.pdf', 'pdf')).toBe('도면.v2.final_편집.pdf')
})

test('확장자가 없는 이름도 처리한다', () => {
  expect(editedName('도면', 'pdf')).toBe('도면_편집.pdf')
})

test('이미지 원본을 PDF로 저장하면 확장자가 pdf가 된다', () => {
  expect(editedName('현장.jpg', 'pdf')).toBe('현장_편집.pdf')
})

test('한 장 저장은 장 번호가 붙는다', () => {
  expect(editedName('3층 도면.pdf', 'png', 3)).toBe('3층 도면_편집_3장.png')
})
