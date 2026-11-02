<script setup>
import { flipBend, setTextSize } from '../lib/geometry.js'

const props = defineProps({ doc: { type: Object, required: true } })

function flip() {
  props.doc.update(props.doc.selected.value.id, flipBend)
}
function resize(delta) {
  props.doc.update(props.doc.selected.value.id, (o) => setTextSize(o, o.size + delta))
}
</script>

<template>
  <div v-if="doc.selected.value" class="selbar">
    <button class="del" @click="doc.remove(doc.selected.value.id)">🗑 지우기</button>
    <button v-if="doc.selected.value.type === 'pipe' && doc.selected.value.bend" @click="flip">↻ 방향 바꾸기</button>
    <template v-if="doc.selected.value.type === 'text'">
      <button @click="resize(4)">가 글씨 크게</button>
      <button @click="resize(-4)">가 글씨 작게</button>
    </template>
  </div>
</template>

<style scoped>
.selbar { display: flex; gap: 8px; }
button { min-height: 52px; padding: 0 18px; font-size: 1.1rem; font-weight: bold; border-radius: 8px; border: 3px solid #1d4ed8; background: #fff; color: #1e3a8a; }
button.del { border-color: #b91c1c; background: #b91c1c; color: #fff; }
</style>
