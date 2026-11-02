<script setup>
import { useDocument } from './composables/useDocument.js'
import PageCanvas from './components/PageCanvas.vue'

const doc = useDocument()

async function onFile(e) {
  const f = e.target.files[0]
  if (f) await doc.openFile(f)
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh">
    <div>
      <input id="tmp-file" type="file" @change="onFile" />
      <button @click="doc.setTool('rect')">공조</button>
      <button @click="doc.setTool('pipe')">배관</button>
      <button @click="doc.setTool('bend')">꺾기</button>
      <button @click="doc.setPage(doc.currentPage.value + 1)">다음</button>
      <button @click="doc.zoomStep(1)">+</button>
    </div>
    <PageCanvas :doc="doc" />
  </div>
</template>
