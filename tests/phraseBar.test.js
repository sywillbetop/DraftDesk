import { test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import PhraseBar from '../src/components/PhraseBar.vue'

beforeEach(() => localStorage.clear())

const makeDoc = () => ({ pendingText: ref('') })

test('처음 열면 기본 글씨 13개가 버튼으로 나온다', () => {
  const w = mount(PhraseBar, { props: { doc: makeDoc() } })
  expect(w.findAll('button.phrase')).toHaveLength(13)
})

test('글씨 버튼을 누르면 붙일 글씨로 설정된다', async () => {
  const doc = makeDoc()
  const w = mount(PhraseBar, { props: { doc } })
  await w.findAll('button.phrase')[0].trigger('click')
  expect(doc.pendingText.value).toBe('실내기')
})

test('공백만 입력하고 붙이기를 눌러도 목록은 그대로다', async () => {
  const doc = makeDoc()
  const w = mount(PhraseBar, { props: { doc } })
  await w.find('input').setValue('   ')
  await w.find('button.add').trigger('click')
  expect(w.findAll('button.phrase')).toHaveLength(13)
  expect(doc.pendingText.value).toBe('')
})

test('새 말을 입력하면 목록이 14개가 되고 저장된다', async () => {
  const doc = makeDoc()
  const w = mount(PhraseBar, { props: { doc } })
  await w.find('input').setValue('취출구')
  await w.find('button.add').trigger('click')
  expect(w.findAll('button.phrase')).toHaveLength(14)
  expect(doc.pendingText.value).toBe('취출구')
  expect(JSON.parse(localStorage.getItem('draftdesk.phrases.v2'))).toContain('취출구')
})

test('✕를 누르면 그 말이 목록에서 사라진다', async () => {
  const w = mount(PhraseBar, { props: { doc: makeDoc() } })
  await w.findAll('button.remove')[0].trigger('click')
  expect(w.findAll('button.phrase')).toHaveLength(12)
  expect(w.text()).not.toContain('실내기')
})
