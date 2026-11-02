import { ref, computed } from 'vue'
import { modifiedPages } from '../lib/saveScope.js'
import { loadColor, saveColor } from '../lib/palette.js'
import { openSource } from '../lib/source.js'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

export function useDocument() {
  const source = ref(null)
  const currentPage = ref(0)
  const zoom = ref('fit')
  const effectiveScale = ref(1)
  const objectsByPage = ref({})
  const selectedId = ref(null)
  const tool = ref('select')
  const color = ref(loadColor())
  const pendingText = ref('')
  const changed = ref(false)

  const currentObjects = computed(() => objectsByPage.value[currentPage.value] || [])
  const modified = computed(() => modifiedPages(objectsByPage.value))
  const hasUnsaved = computed(() => changed.value && modified.value.length > 0)
  const selected = computed(() => currentObjects.value.find((o) => o.id === selectedId.value) || null)

  function setSource(s) {
    source.value = s
    currentPage.value = 0
    zoom.value = 'fit'
    objectsByPage.value = {}
    selectedId.value = null
    tool.value = 'select'
    changed.value = false
  }

  // 열기에 실패하면 기존 상태는 그대로 두고 오류를 던진다
  async function openFile(file) {
    setSource(await openSource(file))
  }

  function setPage(i) {
    if (!source.value || i < 0 || i >= source.value.pageCount) return
    currentPage.value = i
    selectedId.value = null
  }

  function setZoom(z) {
    zoom.value = z === 'fit' ? 'fit' : Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
  }

  function zoomStep(dir) {
    setZoom(effectiveScale.value * Math.pow(1.25, dir))
  }

  function setTool(t) {
    tool.value = t
    if (t !== 'select') selectedId.value = null
  }

  function setColor(hex) {
    color.value = hex
    saveColor(hex)
  }

  function add(obj) {
    const page = currentPage.value
    objectsByPage.value = { ...objectsByPage.value, [page]: [...(objectsByPage.value[page] || []), obj] }
    changed.value = true
    if (obj.type !== 'text') {
      tool.value = 'select'
      selectedId.value = obj.id
    }
  }

  function update(id, fn) {
    const page = currentPage.value
    objectsByPage.value = {
      ...objectsByPage.value,
      [page]: (objectsByPage.value[page] || []).map((o) => (o.id === id ? fn(o) : o)),
    }
    changed.value = true
  }

  function remove(id) {
    const page = currentPage.value
    objectsByPage.value = {
      ...objectsByPage.value,
      [page]: (objectsByPage.value[page] || []).filter((o) => o.id !== id),
    }
    if (selectedId.value === id) selectedId.value = null
    changed.value = true
  }

  function select(id) {
    selectedId.value = id
  }

  function markSaved() {
    changed.value = false
  }

  return {
    source, currentPage, zoom, effectiveScale, objectsByPage, selectedId, tool, color, pendingText,
    currentObjects, modified, hasUnsaved, selected,
    setSource, openFile, setPage, setZoom, zoomStep, setTool, setColor, add, update, remove, select, markSaved,
  }
}
