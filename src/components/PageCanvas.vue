<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { drawObject, drawSelection, HANDLE_PX } from '../lib/draw.js'
import {
  makeRect, makePipe, makeText, hitTest, hitHandle, moveObject, resizeByHandle,
} from '../lib/geometry.js'

const props = defineProps({ doc: { type: Object, required: true } })

const viewportEl = ref(null)
const baseEl = ref(null)
const overlayEl = ref(null)
const pageDims = ref({ w: 0, h: 0 })
const fitScale = ref(1)
const draft = ref(null)
const error = ref('')
const dpr = window.devicePixelRatio || 1
let drag = null
let renderToken = 0

const scale = computed(() => (props.doc.zoom.value === 'fit' ? fitScale.value : props.doc.zoom.value))
const stageStyle = computed(() => ({
  width: `${pageDims.value.w * scale.value}px`,
  height: `${pageDims.value.h * scale.value}px`,
}))
const cursor = computed(() => (props.doc.tool.value === 'select' ? 'default' : 'crosshair'))

function computeFit() {
  const el = viewportEl.value
  if (!el || !pageDims.value.w) return
  fitScale.value = Math.max(0.1, (el.clientWidth - 32) / pageDims.value.w)
}

async function loadPage() {
  const source = props.doc.source.value
  if (!source) return
  const token = ++renderToken
  error.value = ''
  try {
    const probe = await source.renderPage(props.doc.currentPage.value, 0.1)
    if (token !== renderToken) return
    pageDims.value = { w: probe.viewW, h: probe.viewH }
    computeFit()
    props.doc.effectiveScale.value = scale.value
    await renderBase(token)
  } catch (e) {
    error.value = '이 페이지를 보여줄 수 없습니다.'
  }
}

async function renderBase(token) {
  const source = props.doc.source.value
  if (!source) return
  const maxSide = Math.max(pageDims.value.w, pageDims.value.h)
  const px = Math.min(scale.value * dpr, 6000 / maxSide)
  const r = await source.renderPage(props.doc.currentPage.value, px)
  if (token !== renderToken) return
  await nextTick()
  const base = baseEl.value
  base.width = r.canvas.width
  base.height = r.canvas.height
  base.getContext('2d').drawImage(r.canvas, 0, 0)
  drawOverlay()
}

function drawOverlay() {
  const c = overlayEl.value
  if (!c) return
  const s = scale.value * dpr
  c.width = Math.ceil(pageDims.value.w * s)
  c.height = Math.ceil(pageDims.value.h * s)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  for (const o of props.doc.currentObjects.value) drawObject(ctx, o, s)
  if (draft.value) drawObject(ctx, draft.value, s)
  const sel = props.doc.selected.value
  if (sel && props.doc.tool.value === 'select') drawSelection(ctx, sel, s)
}

watch([props.doc.source, props.doc.currentPage], loadPage)
watch(scale, async () => {
  props.doc.effectiveScale.value = scale.value
  const token = ++renderToken
  await renderBase(token)
})
watch(
  [props.doc.currentObjects, props.doc.selectedId, props.doc.tool, draft],
  drawOverlay,
  { deep: true },
)

let ro
onMounted(() => {
  loadPage()
  ro = new ResizeObserver(computeFit)
  if (viewportEl.value) ro.observe(viewportEl.value)
})
onBeforeUnmount(() => ro && ro.disconnect())

function toPt(e) {
  const r = overlayEl.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) / scale.value, y: (e.clientY - r.top) / scale.value }
}

function previewOf(tool, a, b) {
  const color = props.doc.color.value
  if (tool === 'rect') {
    return { type: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y), color }
  }
  return { type: 'pipe', x1: a.x, y1: a.y, x2: b.x, y2: b.y, bend: tool === 'bend', flip: false, color }
}

function onDown(e) {
  const doc = props.doc
  const pt = toPt(e)
  const tool = doc.tool.value
  if (tool === 'rect' || tool === 'pipe' || tool === 'bend') {
    drag = { mode: 'draw', start: pt }
    draft.value = null
  } else if (tool === 'text') {
    if (doc.pendingText.value) doc.add(makeText(pt, doc.pendingText.value, doc.color.value))
    return
  } else {
    const sel = doc.selected.value
    const handle = sel && hitHandle(sel, pt, HANDLE_PX / scale.value)
    if (handle) {
      drag = { mode: 'handle', id: sel.id, handle, orig: sel }
    } else {
      const objs = doc.currentObjects.value
      let hit = null
      for (let i = objs.length - 1; i >= 0; i--) {
        if (hitTest(objs[i], pt, 8 / scale.value)) { hit = objs[i]; break }
      }
      if (hit) {
        doc.select(hit.id)
        drag = { mode: 'move', id: hit.id, orig: hit, start: pt }
      } else {
        doc.select(null)
        const v = viewportEl.value
        drag = { mode: 'pan', x: e.clientX, y: e.clientY, left: v.scrollLeft, top: v.scrollTop }
      }
    }
  }
  try {
    overlayEl.value.setPointerCapture(e.pointerId)
  } catch {
    // 포인터를 잡지 못해도 그리기는 계속된다
  }
}

function onMove(e) {
  if (!drag) return
  const doc = props.doc
  const pt = toPt(e)
  if (drag.mode === 'draw') {
    draft.value = previewOf(doc.tool.value, drag.start, pt)
  } else if (drag.mode === 'move') {
    doc.update(drag.id, () => moveObject(drag.orig, pt.x - drag.start.x, pt.y - drag.start.y))
  } else if (drag.mode === 'handle') {
    doc.update(drag.id, () => resizeByHandle(drag.orig, drag.handle, pt))
  } else if (drag.mode === 'pan') {
    viewportEl.value.scrollLeft = drag.left - (e.clientX - drag.x)
    viewportEl.value.scrollTop = drag.top - (e.clientY - drag.y)
  }
}

function onUp(e) {
  if (!drag) return
  const doc = props.doc
  if (drag.mode === 'draw') {
    const pt = toPt(e)
    const tool = doc.tool.value
    const color = doc.color.value
    const made = tool === 'rect'
      ? makeRect(drag.start, pt, color)
      : makePipe(drag.start, pt, color, tool === 'bend')
    draft.value = null
    if (made) doc.add(made)
  }
  drag = null
}

function onWheel(e) {
  props.doc.zoomStep(e.deltaY < 0 ? 1 : -1)
}
</script>

<template>
  <div ref="viewportEl" class="viewport" @wheel.prevent="onWheel">
    <div class="stage" :style="stageStyle">
      <canvas ref="baseEl" class="layer" />
      <canvas
        ref="overlayEl"
        class="layer"
        :style="{ cursor }"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      />
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.viewport { flex: 1; min-height: 0; overflow: auto; background: #d1d5db; padding: 16px; box-sizing: border-box; }
.stage { position: relative; margin: 0 auto; background: #fff; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3); }
.layer { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
.error { color: #b91c1c; font-weight: bold; }
</style>
