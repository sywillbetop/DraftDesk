export function editedName(originalName, ext, pageNumber) {
  const dot = originalName.lastIndexOf('.')
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  const page = pageNumber ? `_${pageNumber}장` : ''
  return `${base}_편집${page}.${ext}`
}
