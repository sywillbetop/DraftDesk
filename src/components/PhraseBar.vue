<script setup>
import { ref } from 'vue'
import { loadPhrases, savePhrases, addPhrase, removePhrase } from '../lib/phrases.js'

const props = defineProps({ doc: { type: Object, required: true } })

const phrases = ref(loadPhrases())
const typed = ref('')

function choose(p) {
  props.doc.pendingText.value = p
}

function addTyped() {
  const t = typed.value.trim()
  if (!t) return
  phrases.value = addPhrase(phrases.value, t)
  savePhrases(phrases.value)
  props.doc.pendingText.value = t
  typed.value = ''
}

function remove(p) {
  phrases.value = removePhrase(phrases.value, p)
  savePhrases(phrases.value)
  if (props.doc.pendingText.value === p) props.doc.pendingText.value = ''
}
</script>

<template>
  <div class="phrases">
    <div class="head">
      <slot />
      <div class="typing">
        <input v-model="typed" placeholder="직접 입력" @keydown.enter="addTyped" />
        <button class="add" @click="addTyped">붙이기</button>
      </div>
    </div>
    <div class="list">
      <span class="help">붙일 말을 누른 뒤 도면을 클릭하세요.</span>
      <span v-for="p in phrases" :key="p" class="chip">
        <button class="phrase" :class="{ on: doc.pendingText.value === p }" @click="choose(p)">{{ p }}</button>
        <button class="remove" :aria-label="`${p} 지우기`" @click="remove(p)">✕</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.phrases { display: flex; flex-direction: column; gap: 8px; flex: 1 1 100%; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
.help { align-self: center; font-weight: bold; }
.list { display: flex; flex-wrap: wrap; gap: 8px; max-height: 108px; overflow-y: auto; }
.chip { display: inline-flex; }
button { font-weight: bold; border-radius: 8px; border: 3px solid #1d4ed8; background: #fff; color: #1e3a8a; }
.phrase { min-height: 48px; padding: 0 14px; border-radius: 8px 0 0 8px; border-right-width: 0; }
.phrase.on { background: #1d4ed8; color: #fff; }
.remove { min-width: 44px; min-height: 48px; border-radius: 0 8px 8px 0; border-color: #b91c1c; color: #b91c1c; padding: 0; }
.typing { display: flex; gap: 8px; flex: 1; min-width: 280px; }
input { flex: 1; min-height: 48px; font-size: 1.1rem; padding: 0 12px; border: 3px solid #1d4ed8; border-radius: 8px; box-sizing: border-box; }
.add { min-height: 48px; padding: 0 20px; background: #1d4ed8; color: #fff; }
@media (max-width: 700px) {
  .typing { min-width: 0; flex-basis: 100%; }
  .list { max-height: 30vh; }
}
</style>
