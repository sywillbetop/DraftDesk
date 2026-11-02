export const DEFAULT_PHRASES = [
  '덕트', '2웨이', '4웨이', '환기구', '급기', '배기', '에어컨', '실외기',
  '냉매관', '배수관', '드레인', '보온', '상향', '하향', '천장', '벽체',
]

const KEY = 'draftdesk.phrases'

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
