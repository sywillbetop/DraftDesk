import { test, expect } from 'vitest'
import { useDocument } from '../src/composables/useDocument.js'
import { makeRect, makeText } from '../src/lib/geometry.js'

const fakeSource = (pageCount = 3) => ({ kind: 'pdf', name: 'a.pdf', pageCount, bytes: null, renderPage: async () => ({}) })
const rect = () => makeRect({ x: 0, y: 0 }, { x: 50, y: 50 }, '#DC2626')

function opened() {
  const doc = useDocument()
  doc.setSource(fakeSource())
  return doc
}

test('도형을 추가하면 그 페이지가 수정한 페이지가 된다', () => {
  const doc = opened()
  doc.add(rect())
  expect(doc.modified.value).toEqual([0])
})

test('페이지를 넘겼다 돌아와도 도형이 유지된다', () => {
  const doc = opened()
  const r = rect()
  doc.add(r)
  doc.setPage(2)
  expect(doc.currentObjects.value).toEqual([])
  doc.setPage(0)
  expect(doc.currentObjects.value).toEqual([r])
})

test('페이지 범위를 벗어나는 이동은 무시한다', () => {
  const doc = opened()
  doc.setPage(5)
  expect(doc.currentPage.value).toBe(0)
  doc.setPage(-1)
  expect(doc.currentPage.value).toBe(0)
})

test('도형을 하나 놓으면 도구가 선택으로 돌아가고 그 도형이 선택된다', () => {
  const doc = opened()
  doc.setTool('rect')
  const r = rect()
  doc.add(r)
  expect(doc.tool.value).toBe('select')
  expect(doc.selectedId.value).toBe(r.id)
})

test('글씨를 놓으면 도구가 선택으로 돌아가고 그 글씨가 선택된다', () => {
  const doc = opened()
  doc.setTool('text')
  const t = makeText({ x: 1, y: 1 }, '덕트', '#DC2626')
  doc.add(t)
  expect(doc.tool.value).toBe('select')
  expect(doc.selectedId.value).toBe(t.id)
  expect(doc.selected.value.text).toBe('덕트')
})

test('확대는 25%~400%로 제한된다', () => {
  const doc = opened()
  doc.setZoom(9)
  expect(doc.zoom.value).toBe(4)
  doc.setZoom(0.01)
  expect(doc.zoom.value).toBe(0.25)
})

test('zoomStep은 현재 배율에서 한 단계씩 바꾼다', () => {
  const doc = opened()
  doc.effectiveScale.value = 1
  doc.zoomStep(1)
  expect(doc.zoom.value).toBe(1.25)
})

test('도형을 전부 지우면 수정한 페이지가 없고 저장 안 한 작업도 없다', () => {
  const doc = opened()
  const r = rect()
  doc.add(r)
  expect(doc.hasUnsaved.value).toBe(true)
  doc.remove(r.id)
  expect(doc.modified.value).toEqual([])
  expect(doc.hasUnsaved.value).toBe(false)
})

test('markSaved 후에는 저장 안 한 작업이 없다', () => {
  const doc = opened()
  doc.add(rect())
  doc.markSaved()
  expect(doc.hasUnsaved.value).toBe(false)
})

test('update는 선택한 도형만 바꾼다', () => {
  const doc = opened()
  const r = rect()
  doc.add(r)
  doc.update(r.id, (o) => ({ ...o, color: '#15803D' }))
  expect(doc.currentObjects.value[0].color).toBe('#15803D')
})

test('새 도면을 열면 도형과 선택이 초기화된다', () => {
  const doc = opened()
  doc.add(rect())
  doc.setSource(fakeSource(5))
  expect(doc.modified.value).toEqual([])
  expect(doc.currentPage.value).toBe(0)
  expect(doc.selectedId.value).toBeNull()
})
