const OPEN_FAILED = 'OPEN_FAILED'

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

async function openPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  // pdfjs 는 넘겨준 버퍼를 워커로 넘겨 버리므로 복사본을 준다
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  return {
    kind: 'pdf',
    name: file.name,
    pageCount: pdf.numPages,
    bytes,
    async renderPage(index, scale) {
      const page = await pdf.getPage(index + 1)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const [x0, y0, x1, y1] = page.view
      return {
        canvas,
        viewW: viewport.width / scale,
        viewH: viewport.height / scale,
        page: { w: x1 - x0, h: y1 - y0, rotation: ((page.rotate % 360) + 360) % 360 },
      }
    },
  }
}

async function openImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const url = URL.createObjectURL(new Blob([bytes], { type: file.type }))
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(OPEN_FAILED))
    el.src = url
  })
  return {
    kind: 'image',
    name: file.name,
    mime: file.type,
    pageCount: 1,
    bytes,
    async renderPage(_index, scale) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(img.naturalWidth * scale)
      canvas.height = Math.ceil(img.naturalHeight * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      return {
        canvas,
        viewW: img.naturalWidth,
        viewH: img.naturalHeight,
        page: { w: img.naturalWidth, h: img.naturalHeight, rotation: 0 },
      }
    },
  }
}

export async function openSource(file) {
  try {
    if (isPdf(file)) return await openPdf(file)
    if (file.type.startsWith('image/')) return await openImage(file)
  } catch {
    // 깨진 파일, 암호 PDF 등은 모두 같은 오류로 알린다
  }
  throw new Error(OPEN_FAILED)
}
