export const DEFAULT_PHRASES = [
  '실내기', '실외기', '배관', '냉매관', '단배관', '다배관', '1way', '2way', '4way',
  '마력', '인버터', '개별 공조', '덕트',
]

// 기본 목록을 바꿀 때 올려서, 예전에 저장된 목록 대신 새 목록이 보이게 한다
const KEY = 'draftdesk.phrases.v2'

export function loadPhrases() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(list) && list.every((s) => typeof s === 'string')) return list
  } catch {
    // 깨졌거나 막혔으면 기본 목록
  }
  return [...DEFAULT_PHRASES]
}

export function savePhrases(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // 저장소를 못 써도 앱은 계속 동작한다
  }
}

export function addPhrase(list, text) {
  const t = text.trim()
  if (!t || list.includes(t)) return list
  return [...list, t]
}

export function removePhrase(list, text) {
  return list.filter((p) => p !== text)
}
