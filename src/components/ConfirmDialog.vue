<script setup>
defineProps({
  message: { type: String, required: true },
  okLabel: { type: String, default: '네' },
  cancelLabel: { type: String, default: '아니요' },
})
defineEmits(['ok', 'cancel'])
</script>

<template>
  <div class="backdrop">
    <div class="dialog" role="alertdialog" :aria-label="message">
      <p class="msg">{{ message }}</p>
      <div class="actions">
        <button class="cancel" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button class="ok" @click="$emit('ok')">{{ okLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 20; padding: 16px; box-sizing: border-box; }
.dialog { background: #fff; border-radius: 12px; padding: 24px; width: min(560px, 100%); box-sizing: border-box; }
.msg { margin: 0 0 24px; font-size: 1.4rem; font-weight: bold; line-height: 1.5; }
.actions { display: flex; gap: 12px; }
button { flex: 1; min-height: 64px; font-size: 1.3rem; font-weight: bold; border-radius: 10px; border: 3px solid #6b7280; background: #fff; color: #111827; }
button.ok { background: #b91c1c; border-color: #b91c1c; color: #fff; }
</style>
