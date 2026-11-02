<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useDocument } from './composables/useDocument.js'
import TopBar from './components/TopBar.vue'
import ColorPalette from './components/ColorPalette.vue'
import PhraseBar from './components/PhraseBar.vue'
import SelectionBar from './components/SelectionBar.vue'
import PageCanvas from './components/PageCanvas.vue'
import PageNav from './components/PageNav.vue'
import Toast from './components/Toast.vue'
import SaveDialog from './components/SaveDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

const doc = useDocument()
const fileInput = ref(null)
const toast = ref(null)
let toastTimer = null

function showToast(message, kind = 'ok') {
  toast.value = { message, kind }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 5000)
}

async function openFile(file) {
  try {
    await doc.openFile(file)
  } catch {
    showToast('이 파일은 열 수 없습니다. PDF나 이미지 파일인지 확인해 주세요.', 'error')
  }
}

const saving = ref(false)

function onSaved(filename, pages) {
  saving.value = false
  doc.markSaved(pages)
  showToast(`저장했습니다: ${filename}  (다운로드 폴더에 들어갑니다. 같은 이름이 있으면 (1)이 붙을 수 있습니다)`)
}

function onSaveError() {
  saving.value = false
  showToast('저장하지 못했습니다. 다시 시도해 주세요.', 'error')
}

const pendingFile = ref(null)

// 열기 경로(버튼·끌어다 놓기)는 모두 여기를 지나 저장 안 한 작업을 확인한다
function requestOpen(file) {
  if (doc.hasUnsaved.value) pendingFile.value = file
  else openFile(file)
}

function confirmOpen() {
  const f = pendingFile.value
  pendingFile.value = null
  openFile(f)
}

function onPick(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (f) requestOpen(f)
}

function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) requestOpen(f)
}

function warnBeforeLeave(e) {
  e.preventDefault()
  e.returnValue = ''
}
watch(doc.hasUnsaved, (unsaved) => {
  if (unsaved) window.addEventListener('beforeunload', warnBeforeLeave)
  else window.removeEventListener('beforeunload', warnBeforeLeave)
})

const showColors = computed(() => ['rect', 'pipe', 'bend', 'text'].includes(doc.tool.value) || !!doc.selected.value)

function onKey(e) {
  if (e.key !== 'Delete' || !doc.selected.value) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  doc.remove(doc.selected.value.id)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', warnBeforeLeave)
})
</script>

<template>
  <div class="app" @dragover.prevent @drop.prevent="onDrop">
    <input ref="fileInput" type="file" accept=".pdf,image/*" hidden @change="onPick" />
    <TopBar :doc="doc" @open="fileInput.click()" @save="saving = true" />
    <SaveDialog v-if="saving" :doc="doc" @cancel="saving = false" @done="onSaved" @error="onSaveError" />
    <ConfirmDialog
      v-if="pendingFile"
      message="저장하지 않은 작업이 있습니다. 그래도 새로 열까요?"
      ok-label="네, 새로 열기"
      cancel-label="아니요"
      @ok="confirmOpen"
      @cancel="pendingFile = null"
    />
    <Toast v-if="toast" :message="toast.message" :kind="toast.kind" @close="toast = null" />

    <template v-if="doc.source.value">
      <div v-if="showColors || doc.tool.value === 'text' || doc.selected.value" class="options">
        <PhraseBar v-if="doc.tool.value === 'text'" :doc="doc"><ColorPalette :doc="doc" /></PhraseBar>
        <ColorPalette v-else-if="showColors" :doc="doc" />
        <SelectionBar :doc="doc" />
      </div>
      <PageCanvas :doc="doc" />
      <PageNav :doc="doc" />
    </template>
    <div v-else class="empty">
      <p>도면 파일을 열어 주세요</p>
      <button @click="fileInput.click()">📂 도면 열기</button>
      <p class="hint">PDF나 사진 파일을 이 화면에 끌어다 놓아도 됩니다.</p>
    </div>
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; }
.options { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 8px 12px; background: #eef2ff; border-bottom: 2px solid #9ca3af; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; font-size: 1.6rem; font-weight: bold; }
.empty p { margin: 0; }
.empty .hint { font-size: 1.1rem; font-weight: normal; color: #374151; }
.empty button { min-height: 80px; padding: 0 48px; font-size: 1.6rem; font-weight: bold; border-radius: 12px; border: 0; background: #1d4ed8; color: #fff; }
</style>
