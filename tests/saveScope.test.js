import { test, expect } from 'vitest'
import { modifiedPages, saveOptions } from '../src/lib/saveScope.js'

test('도형이 있는 페이지만 오름차순으로 돌려준다', () => {
  expect(modifiedPages({ 2: [{}], 0: [], 1: [{}, {}] })).toEqual([1, 2])
})

test('여러 장 PDF는 세 가지 범위를 모두 보여 준다', () => {
  const o = saveOptions({ pageCount: 12, isImage: false, modified: [1, 4] })
  expect(o.scopes).toEqual(['all', 'modified', 'one'])
  expect(o.disabled).toEqual([])
})

test('수정한 페이지가 없으면 수정한 페이지만이 비활성이다', () => {
  const o = saveOptions({ pageCount: 12, isImage: false, modified: [] })
  expect(o.disabled).toEqual(['modified'])
})

test('한 장짜리 PDF는 한 장 범위만 남는다', () => {
  const o = saveOptions({ pageCount: 1, isImage: false, modified: [0] })
  expect(o.scopes).toEqual(['one'])
})

test('이미지 도면은 한 장 범위만 남는다', () => {
  const o = saveOptions({ pageCount: 1, isImage: true, modified: [0] })
  expect(o.scopes).toEqual(['one'])
})

test('형식은 한 장 범위일 때만 고른다', () => {
  const o = saveOptions({ pageCount: 12, isImage: false, modified: [1] })
  expect(o.formatChoiceFor).toEqual(['one'])
})

test('PDF로 저장할 수 없는 PDF는 한 장 이미지 저장만 남는다', () => {
  const o = saveOptions({ pageCount: 12, isImage: false, modified: [1], canSavePdf: false })
  expect(o.scopes).toEqual(['one'])
  expect(o.pdf).toBe(false)
})

test('보통은 PDF 저장이 가능하다', () => {
  expect(saveOptions({ pageCount: 3, isImage: false, modified: [] }).pdf).toBe(true)
})
