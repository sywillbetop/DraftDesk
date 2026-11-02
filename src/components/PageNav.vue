<script setup>
import { computed } from 'vue'

const props = defineProps({ doc: { type: Object, required: true } })

const total = computed(() => props.doc.source.value?.pageCount || 0)
const percent = computed(() => Math.round(props.doc.effectiveScale.value * 100))
</script>

<template>
  <div class="nav">
    <button :disabled="doc.currentPage.value <= 0" @click="doc.setPage(doc.currentPage.value - 1)">◀ 이전 장</button>
    <span class="count">{{ doc.currentPage.value + 1 }} / {{ total }}</span>
    <button :disabled="doc.currentPage.value >= total - 1" @click="doc.setPage(doc.currentPage.value + 1)">다음 장 ▶</button>
    <span class="gap" />
    <button @click="doc.zoomStep(-1)">－ 작게</button>
    <span class="zoom">{{ percent }}%</span>
    <button @click="doc.zoomStep(1)">＋ 크게</button>
  </div>
</template>

<style scoped>
.nav { display: flex; align-items: center; gap: 10px; padding: 8px; background: #fff; border-top: 2px solid #9ca3af; justify-content: center; }
button { min-height: 52px; padding: 0 18px; font-size: 1.1rem; font-weight: bold; border-radius: 8px; border: 3px solid #1d4ed8; background: #fff; color: #1e3a8a; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.count { font-size: 1.3rem; font-weight: bold; min-width: 90px; text-align: center; }
.zoom { font-weight: bold; min-width: 64px; text-align: center; }
.gap { width: 40px; }
@media (max-width: 700px) {
  .nav { flex-wrap: wrap; gap: 6px; }
  .gap { flex-basis: 100%; width: auto; height: 0; }
  .nav { flex-wrap: nowrap; gap: 4px; padding: 6px 4px; }
  .gap { display: none; }
  button { min-height: 40px; padding: 0 8px; font-size: 0.85rem; border-width: 2px; white-space: nowrap; }
  .count { min-width: 44px; font-size: 1rem; }
  .zoom { min-width: 40px; font-size: 0.9rem; }
}
</style>
