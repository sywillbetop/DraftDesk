<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { drawObject, drawSelection, HANDLE_PX } from '../lib/draw.js'
import { distance, pinchScale } from '../lib/pinch.js'
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
const ready = ref(false)
const error = ref('')
const dpr = window.devicePixelRatio || 1
let drag = null
let renderToken = 0
let paintedScale = 0
const MAX_SIDE_PX = 8000

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

// 페이지(또는 도면)가 바뀔 때: 크기를 먼저 알아내고, 그림이 다 그려질 때까지 입력을 막는다
async function show() {
  const source = props.doc.source.value
  if (!source) return
  const token = ++renderToken
  ready.value = false
  error.value = ''
  drawOverlay()
  try {
    pageDims.value = await source.pageSize(props.doc.currentPage.value)
    if (token !== renderToken) return
    computeFit()
    props.doc.effectiveScale.value = scale.value
    await paint(token)
    if (token !== renderToken) return
    // 그리는 사이에 배율이 바뀌었으면 한 번 더 그린다
    if (paintedScale !== scale.value) await paint(token)
    if (token === renderToken) ready.value = true
  } catch {
    if (token === renderToken) error.value = '이 페이지를 보여줄 수 없습니다.'
  }
}

// 배율만 바뀔 때
async function repaint() {
  props.doc.effectiveScale.value = scale.value
  if (!ready.value) return
  const token = ++renderToken
  try {
    await paint(token)
  } catch {
    if (token === renderToken) error.value = '이 페이지를 보여줄 수 없습니다.'
  }
}

async function paint(token) {
  const source = props.doc.source.value
  const maxSide = Math.max(pageDims.value.w, pageDims.value.h)
  const s = scale.value
  const px = Math.min(s * dpr, MAX_SIDE_PX / maxSide)
  const r = await source.renderPage(props.doc.currentPage.value, px)
  if (token !== renderToken) return
  await nextTick()
  const base = baseEl.value
  base.width = r.canvas.width
  base.height = r.canvas.height
  base.getContext('2d').drawImage(r.canvas, 0, 0)
  paintedScale = s
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
  if (!ready.value) return
  for (const o of props.doc.currentObjects.value) drawObject(ctx, o, s)
  if (draft.value) drawObject(ctx, draft.value, s)
  const sel = props.doc.selected.value
  if (sel && props.doc.tool.value === 'select') drawSelection(ctx, sel, s, handlePx * dpr)
}

watch([props.doc.source, props.doc.currentPage], show)
watch(scale, repaint)
watch(ready, drawOverlay)
watch(
  [props.doc.currentObjects, props.doc.selectedId, props.doc.tool, draft],
  drawOverlay,
  { deep: true },
)

let ro
onMounted(() => {
  show()
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

const pointers = new Map()
let pinch = null
const coarse = window.matchMedia?.('(pointer: coarse)').matches
const handlePx = coarse ? 28 : HANDLE_PX
const hitPx = coarse ? 24 : 8

function startPinch() {
  const [a, b] = [...pointers.values()]
  pinch = { dist: distance(a, b), scale: scale.value }
  drag = null
  draft.value = null
}

function onDown(e) {
  if (!ready.value || e.button !== 0) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) {
    startPinch()
    return
  }
  if (pointers.size > 2) return
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
    const handle = sel && hitHandle(sel, pt, handlePx / scale.value)
    if (handle) {
      drag = { mode: 'handle', id: sel.id, handle, orig: sel }
    } else {
      const objs = doc.currentObjects.value
      let hit = null
      for (let i = objs.length - 1; i >= 0; i--) {
        if (hitTest(objs[i], pt, hitPx / scale.value)) { hit = objs[i]; break }
      }
      if (hit) {
        if (doc.selectedId.value !== hit.id) navigator.vibrate?.(15) // 잡았다는 느낌
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
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pinch) {
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()]
      props.doc.setZoom(pinchScale(pinch.scale, pinch.dist, distance(a, b)))
    }
    return
  }
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
  pointers.delete(e.pointerId)
  if (pinch) {
    // 손가락을 모두 뗄 때까지 그리기·옮기기를 다시 시작하지 않는다
    if (pointers.size === 0) pinch = null
    return
  }
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
      <canvas v-show="ready" ref="baseEl" class="layer" />
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
    <p v-if="!ready && !error" class="loading">불러오는 중…</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.viewport { flex: 1; min-height: 0; overflow: auto; background: #d1d5db; padding: 16px; box-sizing: border-box; }
.stage { position: relative; margin: 0 auto; background: #fff; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3); }
.layer { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
.error { color: #b91c1c; font-weight: bold; font-size: 1.3rem; text-align: center; }
.loading { position: absolute; top: 24px; left: 0; right: 0; text-align: center; font-size: 1.5rem; font-weight: bold; color: #1e3a8a; }
</style>
