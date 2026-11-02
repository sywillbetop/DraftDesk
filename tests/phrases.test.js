import { test, expect, beforeEach } from 'vitest'
import { DEFAULT_PHRASES, loadPhrases, addPhrase, removePhrase, savePhrases } from '../src/lib/phrases.js'

beforeEach(() => localStorage.clear())

test('기본 글씨는 16개이고 순서가 맞다', () => {
  expect(DEFAULT_PHRASES.length).toBe(16)
  expect(DEFAULT_PHRASES[0]).toBe('덕트')
  expect(DEFAULT_PHRASES[15]).toBe('벽체')
})

test('공백만 입력하면 목록이 바뀌지 않는다', () => {
  expect(addPhrase(['덕트'], '   ')).toEqual(['덕트'])
})

test('이미 있는 말은 다시 추가되지 않는다', () => {
  expect(addPhrase(['덕트'], '덕트')).toHaveLength(1)
})

test('새 말은 앞뒤 공백을 지우고 맨 뒤에 붙는다', () => {
  expect(addPhrase(['덕트'], ' 취출구 ')).toEqual(['덕트', '취출구'])
})

test('removePhrase는 해당 말만 지운다', () => {
  expect(removePhrase(['덕트', '급기'], '덕트')).toEqual(['급기'])
})

test('저장한 목록을 다시 불러온다', () => {
  savePhrases(['가', '나'])
  expect(loadPhrases()).toEqual(['가', '나'])
})

test('저장된 JSON이 깨져도 기본 목록이 나온다', () => {
  localStorage.setItem('draftdesk.phrases', '{깨진json')
  expect(loadPhrases()).toEqual(DEFAULT_PHRASES)
})

test('저장된 값이 문자열 배열이 아니면 기본 목록이 나온다', () => {
  localStorage.setItem('draftdesk.phrases', '{"a":1}')
  expect(loadPhrases()).toEqual(DEFAULT_PHRASES)
})
