import { test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/lib/source.js', () => ({ openSource: vi.fn() }))

import { openSource } from '../src/lib/source.js'
import App from '../src/App.vue'
import { makeRect } from '../src/lib/geometry.js'

const fakeSource = (name) => ({ kind: 'pdf', name, pageCount: 2, bytes: null, renderPage: async () => ({}) })
const CONFIRM = '저장하지 않은 작업이 있습니다. 그래도 새로 열까요?'
const OPEN_ERROR = '이 파일은 열 수 없습니다. PDF나 이미지 파일인지 확인해 주세요.'

beforeEach(() => {
  localStorage.clear()
  openSource.mockReset()
})

function mountApp() {
  return mount(App, { global: { stubs: { PageCanvas: true, PageNav: true } } })
}

async function pick(w, name) {
  const input = w.find('input[type=file]')
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], name)], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

async function openFirst(w) {
  openSource.mockResolvedValueOnce(fakeSource('첫 도면.pdf'))
  await pick(w, '첫 도면.pdf')
}

test('그린 것이 없으면 확인 없이 바로 열린다', async () => {
  const w = mountApp()
  await openFirst(w)
  openSource.mockResolvedValueOnce(fakeSource('둘째.pdf'))
  await pick(w, '둘째.pdf')
  expect(w.text()).not.toContain(CONFIRM)
  expect(w.vm.doc.source.value.name).toBe('둘째.pdf')
})

test('그린 것이 있으면 확인 창이 뜨고 아니요를 누르면 기존 도면이 유지된다', async () => {
  const w = mountApp()
  await openFirst(w)
  w.vm.doc.add(makeRect({ x: 0, y: 0 }, { x: 50, y: 50 }, '#DC2626'))
  openSource.mockResolvedValueOnce(fakeSource('둘째.pdf'))
  await pick(w, '둘째.pdf')
  expect(w.text()).toContain(CONFIRM)
  await w.find('button.cancel').trigger('click')
  await flushPromises()
  expect(w.text()).not.toContain(CONFIRM)
  expect(w.vm.doc.source.value.name).toBe('첫 도면.pdf')
  expect(w.vm.doc.modified.value).toEqual([0])
})

test('확인 창에서 네를 누르면 새 도면으로 바뀐다', async () => {
  const w = mountApp()
  await openFirst(w)
  w.vm.doc.add(makeRect({ x: 0, y: 0 }, { x: 50, y: 50 }, '#DC2626'))
  openSource.mockResolvedValueOnce(fakeSource('둘째.pdf'))
  await pick(w, '둘째.pdf')
  await w.find('button.ok').trigger('click')
  await flushPromises()
  expect(w.vm.doc.source.value.name).toBe('둘째.pdf')
  expect(w.vm.doc.modified.value).toEqual([])
})

test('열 수 없는 파일이면 크게 알리고 기존 도면을 유지한다', async () => {
  const w = mountApp()
  await openFirst(w)
  openSource.mockRejectedValueOnce(new Error('OPEN_FAILED'))
  await pick(w, '깨진.pdf')
  expect(w.text()).toContain(OPEN_ERROR)
  expect(w.vm.doc.source.value.name).toBe('첫 도면.pdf')
})
