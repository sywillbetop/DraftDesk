<script setup>
import { PALETTE } from '../lib/palette.js'
import { setColor } from '../lib/geometry.js'

const props = defineProps({ doc: { type: Object, required: true } })

function pick(hex) {
  props.doc.setColor(hex)
  const sel = props.doc.selected.value
  if (sel) props.doc.update(sel.id, (o) => setColor(o, hex))
}
</script>

<template>
  <div class="palette">
    <span class="label">색</span>
    <button
      v-for="c in PALETTE"
      :key="c"
      class="swatch"
      :class="{ on: c === doc.color.value }"
      :style="{ background: c }"
      :aria-label="`색 ${c}`"
      @click="pick(c)"
    />
  </div>
</template>

<style scoped>
.palette { display: flex; align-items: center; gap: 10px; }
.label { font-weight: bold; font-size: 1.1rem; }
.swatch { width: 48px; min-height: 48px; height: 48px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px #6b7280; padding: 0; }
.swatch.on { box-shadow: 0 0 0 5px #111827; }
</style>
