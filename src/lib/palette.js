// 도면이 검정·회색이라 도면과 구분되고, 흰 배경에서 3:1 이상 대비가 나는 8색
export const PALETTE = [
  '#DC2626', '#C2410C', '#A16207', '#15803D',
  '#0F766E', '#1D4ED8', '#7E22CE', '#BE185D',
]

const KEY = 'draftdesk.color'

export function loadColor() {
  try {
    const v = localStorage.getItem(KEY)
    return PALETTE.includes(v) ? v : PALETTE[0]
  } catch {
    return PALETTE[0]
  }
}

export function saveColor(hex) {
  try {
    localStorage.setItem(KEY, hex)
  } catch {
    // 저장소를 못 써도 앱은 계속 동작한다
  }
}
