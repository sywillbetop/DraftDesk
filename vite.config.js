import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// pdf.js 가 한글 CAD 도면 등을 그리는 데 쓰는 글꼴·CMap 을 CDN 대신 앱에 포함한다
const pdfjsAssets = ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((dir) => ({
  src: `node_modules/pdfjs-dist/${dir}/*`,
  dest: `pdfjs/${dir}`,
  rename: { stripBase: true },
}))

export default defineConfig({
  base: './',
  plugins: [vue(), viteStaticCopy({ targets: pdfjsAssets })],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
