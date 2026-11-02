<script setup>
defineProps({ doc: { type: Object, required: true } })
defineEmits(['open', 'save'])

const TOOLS = [
  { key: 'rect', label: '▭ 공조' },
  { key: 'pipe', label: '─ 배관(직선)' },
  { key: 'bend', label: '┐ 배관(꺾기)' },
  { key: 'text', label: '가 글씨' },
]
</script>

<template>
  <div class="topbar">
    <button class="open" @click="$emit('open')">📂 도면 열기</button>
    <button
      v-for="t in TOOLS"
      :key="t.key"
      class="tool"
      :class="{ on: doc.tool.value === t.key }"
      :disabled="!doc.source.value"
      @click="doc.setTool(doc.tool.value === t.key ? 'select' : t.key)"
    >{{ t.label }}</button>
    <button class="save" :disabled="!doc.source.value" @click="$emit('save')">💾 저장</button>
  </div>
</template>

<style scoped>
.topbar { display: flex; gap: 8px; padding: 8px; background: #fff; border-bottom: 2px solid #9ca3af; }
button { flex: 1; min-height: 56px; font-size: 1.1rem; font-weight: bold; border-radius: 8px; border: 3px solid #1d4ed8; background: #fff; color: #1e3a8a; white-space: nowrap; padding: 0 4px; }
button.open { background: #1d4ed8; color: #fff; }
button.tool.on { background: #1d4ed8; color: #fff; }
button.save { background: #15803d; border-color: #15803d; color: #fff; }
button:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
