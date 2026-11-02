export function modifiedPages(objectsByPage) {
  return Object.keys(objectsByPage)
    .filter((k) => objectsByPage[k].length > 0)
    .map(Number)
    .sort((a, b) => a - b)
}

export function saveOptions({ pageCount, isImage, modified, canSavePdf = true }) {
  const single = isImage || pageCount <= 1 || !canSavePdf
  return {
    scopes: single ? ['one'] : ['all', 'modified', 'one'],
    pdf: canSavePdf,
    disabled: !single && modified.length === 0 ? ['modified'] : [],
    formatChoiceFor: ['one'],
  }
}
