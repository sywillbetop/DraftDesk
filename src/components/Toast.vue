<script setup>
defineProps({ message: { type: String, required: true }, kind: { type: String, default: 'ok' } })
defineEmits(['close'])
</script>

<template>
  <div class="toast" :class="kind" role="status">
    <span class="msg">{{ message }}</span>
    <button @click="$emit('close')">닫기</button>
  </div>
</template>

<style scoped>
.toast { display: flex; align-items: center; gap: 16px; padding: 12px 16px; color: #fff; font-size: 1.1rem; font-weight: bold; }
.ok { background: #166534; }
.error { background: #b91c1c; }
.msg { flex: 1; }
button { min-height: 48px; padding: 0 20px; font-weight: bold; border-radius: 8px; border: 3px solid #fff; background: transparent; color: #fff; }
</style>
