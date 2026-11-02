<script setup>
import { ref, computed } from 'vue'
import { saveOptions } from '../lib/saveScope.js'
import { runSave } from '../lib/exportDoc.js'

const props = defineProps({ doc: { type: Object, required: true } })
const emit = defineEmits(['done', 'cancel', 'error'])

const source = computed(() => props.doc.source.value)
const modified = computed(() => props.doc.modified.value)
const options = computed(() =>
  saveOptions({
    pageCount: source.value.pageCount,
    isImage: source.value.kind === 'image',
    modified: modified.value,
    canSavePdf: source.value.canSavePdf !== false,
  }),
)

const scope = ref(options.value.scopes[0])
const format = ref(options.value.pdf ? 'pdf' : 'png')
const saving = ref(false)

const page = computed(() => props.doc.currentPage.value + 1)
const showFormat = computed(() => options.value.formatChoiceFor.includes(scope.value))
const LABELS = computed(() => ({
  all: `전체 페이지(${source.value.pageCount}장)`,
  modified: `수정한 페이지만(${modified.value.length}장)`,
  one: '지금 보는 페이지만(1장)',
}))

async function save() {
  saving.value = true
  try {
    const { filename, pages } = await runSave({
      source: source.value,
      objectsByPage: props.doc.objectsByPage.value,
      scope: scope.value,
      format: showFormat.value ? format.value : 'pdf',
      currentPage: props.doc.currentPage.value,
      modified: modified.value,
    })
    emit('done', filename, pages)
  } catch {
    emit('error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="backdrop">
    <div class="dialog" role="dialog" aria-label="저장하기">
      <h2>저장하기</h2>

      <template v-if="options.scopes.length > 1">
        <p class="q">어느 페이지를 저장할까요?</p>
        <div class="choices">
          <button
            v-for="s in options.scopes"
            :key="s"
            :data-scope="s"
            class="choice"
            :class="{ on: scope === s }"
            :disabled="options.disabled.includes(s) || saving"
            @click="scope = s"
          >{{ LABELS[s] }}</button>
        </div>
        <p v-if="options.disabled.includes('modified')" class="note">수정한 페이지만: 아직 그린 것이 없습니다.</p>
      </template>

      <template v-if="showFormat">
        <p class="q">어떤 파일로 저장할까요?</p>
        <div class="choices">
          <button v-if="options.pdf" data-format="pdf" class="choice" :class="{ on: format === 'pdf' }" :disabled="saving" @click="format = 'pdf'">PDF 파일</button>
          <button data-format="png" class="choice" :class="{ on: format === 'png' }" :disabled="saving" @click="format = 'png'">이미지 (PNG)</button>
        </div>
        <p v-if="!options.pdf" class="note">이 PDF는 PDF로 저장할 수 없어 이미지로 저장됩니다. 장마다 따로 저장해 주세요.</p>
        <p v-if="scope === 'one' && options.scopes.length > 1" class="note">지금 보는 {{ page }}번째 페이지가 저장됩니다.</p>
      </template>

      <p v-if="saving" class="saving">저장 중입니다…</p>

      <div class="actions">
        <button class="cancel" :disabled="saving" @click="$emit('cancel')">취소</button>
        <button class="go" :disabled="saving" @click="save">저장</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 10; padding: 16px; box-sizing: border-box; }
.dialog { background: #fff; border-radius: 12px; padding: 24px; width: min(640px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; }
h2 { margin: 0 0 12px; font-size: 1.6rem; }
.q { font-weight: bold; font-size: 1.2rem; margin: 16px 0 8px; }
.choices { display: flex; flex-direction: column; gap: 10px; }
.choice { min-height: 60px; font-size: 1.2rem; font-weight: bold; border-radius: 10px; border: 3px solid #1d4ed8; background: #fff; color: #1e3a8a; text-align: left; padding: 0 16px; }
.choice.on { background: #1d4ed8; color: #fff; }
.choice:disabled { opacity: 0.45; cursor: not-allowed; }
.note { margin: 8px 0 0; font-weight: bold; color: #374151; }
.saving { margin: 16px 0 0; font-size: 1.3rem; font-weight: bold; color: #1d4ed8; }
.actions { display: flex; gap: 12px; margin-top: 24px; }
.actions button { flex: 1; min-height: 64px; font-size: 1.3rem; font-weight: bold; border-radius: 10px; border: 3px solid #6b7280; background: #fff; color: #111827; }
.actions .go { background: #15803d; border-color: #15803d; color: #fff; }
.actions button:disabled { opacity: 0.5; }
</style>
