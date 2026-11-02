import { test, expect } from 'vitest'
import { openSource } from '../src/lib/source.js'

test('PDF가 아닌 내용이면 OPEN_FAILED로 실패한다', async () => {
  const f = new File(['not a pdf'], 'a.pdf', { type: 'application/pdf' })
  await expect(openSource(f)).rejects.toThrow('OPEN_FAILED')
})

test('PDF도 이미지도 아닌 파일은 OPEN_FAILED로 실패한다', async () => {
  const f = new File(['x'], 'a.txt', { type: 'text/plain' })
  await expect(openSource(f)).rejects.toThrow('OPEN_FAILED')
})
