import { test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SaveDialog from '../src/components/SaveDialog.vue'

function makeDoc({ pageCount = 12, kind = 'pdf', modified = [] } = {}) {
  return {
    source: ref({ kind, name: '도면.pdf', pageCount, bytes: null }),
    currentPage: ref(2),
    objectsByPage: ref({}),
    modified: ref(modified),
  }
}

test('여러 장 PDF는 범위 세 가지를 보여 주고 처음은 전체이다', () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ modified: [1] }) } })
  expect(w.find('[data-scope="all"]').classes()).toContain('on')
  expect(w.find('[data-scope="modified"]').exists()).toBe(true)
  expect(w.find('[data-scope="one"]').exists()).toBe(true)
})

test('그린 것이 없으면 수정한 페이지만이 눌리지 않는다', () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ modified: [] }) } })
  expect(w.find('[data-scope="modified"]').attributes('disabled')).toBeDefined()
  expect(w.text()).toContain('아직 그린 것이 없습니다')
})

test('수정한 페이지 장 수가 버튼에 표시된다', () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ modified: [1, 4, 5] }) } })
  expect(w.find('[data-scope="modified"]').text()).toContain('3장')
})

test('전체나 수정한 페이지만일 때는 형식을 고르지 않는다', async () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ modified: [1] }) } })
  expect(w.find('[data-format="png"]').exists()).toBe(false)
  await w.find('[data-scope="modified"]').trigger('click')
  expect(w.find('[data-format="png"]').exists()).toBe(false)
})

test('지금 보는 페이지만을 고르면 PDF/이미지 형식과 안내가 나온다', async () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ modified: [1] }) } })
  await w.find('[data-scope="one"]').trigger('click')
  expect(w.find('[data-format="pdf"]').exists()).toBe(true)
  expect(w.find('[data-format="png"]').exists()).toBe(true)
  expect(w.text()).toContain('지금 보는 페이지만(1장)')
  expect(w.text()).toContain('3번째 페이지가 저장됩니다')
})

test('한 장짜리 이미지 도면은 범위 선택 없이 형식만 보여 준다', () => {
  const w = mount(SaveDialog, { props: { doc: makeDoc({ pageCount: 1, kind: 'image', modified: [0] }) } })
  expect(w.find('[data-scope="all"]').exists()).toBe(false)
  expect(w.find('[data-format="png"]').exists()).toBe(true)
})

test('PDF로 저장할 수 없는 도면은 이미지 저장만 보여 주고 이유를 알린다', () => {
  const doc = makeDoc({ modified: [1] })
  doc.source.value.canSavePdf = false
  const w = mount(SaveDialog, { props: { doc } })
  expect(w.find('[data-format="pdf"]').exists()).toBe(false)
  expect(w.find('[data-format="png"]').exists()).toBe(true)
  expect(w.text()).toContain('이 PDF는 PDF로 저장할 수 없어')
})
