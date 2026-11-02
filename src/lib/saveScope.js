export function modifiedPages(objectsByPage) {
  return Object.keys(objectsByPage)
    .filter((k) => objectsByPage[k].length > 0)
    .map(Number)
    .sort((a, b) => a - b)
}

export function saveOptions({ pageCount, isImage, modified }) {
  const single = isImage || pageCount <= 1
  return {
    scopes: single ? ['one'] : ['all', 'modified', 'one'],
    disabled: !single && modified.length === 0 ? ['modified'] : [],
    formatChoiceFor: ['one'],
  }
}
