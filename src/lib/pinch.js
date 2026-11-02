export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// 두 손가락 사이가 처음보다 몇 배가 됐는지를 시작 배율에 곱한다
export function pinchScale(startScale, startDist, dist) {
  if (!startDist) return startScale
  return startScale * (dist / startDist)
}
