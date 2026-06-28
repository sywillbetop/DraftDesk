import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { PDFDocument, rgb, LineCapStyle } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

const TOOLS = [
  { key: 'select', label: '선택', icon: '↖' },
  { key: 'text', label: '텍스트', icon: 'T' },
  { key: 'rect', label: '사각형', icon: '□' },
  { key: 'line', label: '선', icon: '/' },
  { key: 'textbox', label: '텍스트 도형', icon: '▣' },
]

const HANDLE_SIZE = 8
const MIN_SIZE = 20
let nextId = 1

function makeText(x, y) {
  return { id: nextId++, kind: 'text', x, y, text: '텍스트', fontSize: 18, color: '#000000' }
}
function makeRect(x, y) {
  return { id: nextId++, kind: 'shape', type: 'rect', x, y, width: 150, height: 80, fillColor: '#4A90D9', borderColor: '#1A5FA8', borderWidth: 2, filled: true }
}
function makeLine(x, y) {
  return { id: nextId++, kind: 'shape', type: 'line', x, y, x2: x + 100, y2: y, borderColor: '#1A5FA8', borderWidth: 2 }
}
function makeTextbox(x, y) {
  return { id: nextId++, kind: 'shape', type: 'textbox', x, y, width: 150, height: 80, fillColor: '#ffffff', borderColor: '#1A5FA8', borderWidth: 2, filled: true, text: '텍스트', fontSize: 14, textColor: '#000000' }
}

function hexToRgb(hex) {
  return rgb(parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255)
}

// 한글 포함 모든 텍스트를 canvas PNG로 렌더링
function renderTextToPng(text, fontSize, color) {
  return new Promise((resolve) => {
    if (!text) { resolve(null); return }
    const oc = document.createElement('canvas')
    const tmp = oc.getContext('2d')
    tmp.font = `${fontSize}px sans-serif`
    const tw = Math.max(Math.ceil(tmp.measureText(text).width) + 4, 4)
    const th = Math.max(Math.ceil(fontSize * 1.4), 4)
    oc.width = tw
    oc.height = th
    const ctx = oc.getContext('2d')
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(text, 2, fontSize)
    oc.toBlob(async (blob) => {
      if (!blob) { resolve(null); return }
      resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), w: tw, h: th })
    }, 'image/png')
  })
}

function getHandles(el) {
  if (el.kind === 'text') return [{ id: 'move', x: el.x, y: el.y }]
  if (el.kind === 'shape' && el.type === 'line') return [{ id: 'p1', x: el.x, y: el.y }, { id: 'p2', x: el.x2, y: el.y2 }]
  const { x, y, width, height } = el
  return [
    { id: 'nw', x, y }, { id: 'n', x: x+width/2, y }, { id: 'ne', x: x+width, y },
    { id: 'e', x: x+width, y: y+height/2 }, { id: 'se', x: x+width, y: y+height },
    { id: 's', x: x+width/2, y: y+height }, { id: 'sw', x, y: y+height }, { id: 'w', x, y: y+height/2 },
  ]
}

function hitHandle(handles, mx, my) {
  for (const h of handles) {
    if (Math.abs(mx-h.x) <= HANDLE_SIZE && Math.abs(my-h.y) <= HANDLE_SIZE) return h.id
  }
  return null
}

function hitElement(el, mx, my) {
  if (el.kind === 'text') return mx >= el.x-4 && mx <= el.x+200 && my >= el.y-el.fontSize && my <= el.y+4
  if (el.kind === 'shape' && el.type === 'line') {
    const dx = el.x2-el.x, dy = el.y2-el.y
    const len = Math.sqrt(dx*dx+dy*dy) || 1
    const t = Math.max(0, Math.min(1, ((mx-el.x)*dx+(my-el.y)*dy)/(len*len)))
    return Math.sqrt((mx-el.x-t*dx)**2+(my-el.y-t*dy)**2) <= 8
  }
  return mx >= el.x && mx <= el.x+el.width && my >= el.y && my <= el.y+el.height
}

function drawElement(ctx, el, selected) {
  ctx.save()
  if (el.kind === 'text') {
    ctx.fillStyle = el.color
    ctx.font = `${el.fontSize}px sans-serif`
    ctx.fillText(el.text, el.x, el.y)
  } else if (el.kind === 'shape') {
    if (el.type === 'line') {
      ctx.beginPath(); ctx.moveTo(el.x,el.y); ctx.lineTo(el.x2,el.y2)
      ctx.strokeStyle = el.borderColor; ctx.lineWidth = el.borderWidth; ctx.lineCap = 'round'; ctx.stroke()
    } else {
      if (el.filled) { ctx.fillStyle = el.fillColor; ctx.fillRect(el.x,el.y,el.width,el.height) }
      ctx.strokeStyle = el.borderColor; ctx.lineWidth = el.borderWidth; ctx.strokeRect(el.x,el.y,el.width,el.height)
      if (el.text) {
        ctx.fillStyle = el.textColor; ctx.font = `${el.fontSize}px sans-serif`; ctx.textBaseline = 'middle'
        ctx.fillText(el.text, el.x+8, el.y+el.height/2, el.width-16)
      }
    }
  }
  ctx.restore()
  if (selected) {
    const handles = getHandles(el)
    ctx.save()
    if (el.kind === 'shape' && el.type !== 'line') {
      ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3])
      ctx.strokeRect(el.x-2, el.y-2, el.width+4, el.height+4); ctx.setLineDash([])
    }
    handles.forEach((h) => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 1.5
      ctx.fillRect(h.x-HANDLE_SIZE/2, h.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(h.x-HANDLE_SIZE/2, h.y-HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE)
    })
    ctx.restore()
  }
}

function applyHandle(el, o, hid, dx, dy) {
  if (el.kind === 'shape' && el.type === 'line') {
    if (hid === 'p1') return { ...el, x: o.x+dx, y: o.y+dy }
    if (hid === 'p2') return { ...el, x2: o.x2+dx, y2: o.y2+dy }
  }
  if (el.kind === 'text') return { ...el, x: o.x+dx, y: o.y+dy }
  let { x, y, width, height } = o
  if (hid==='se') { width=Math.max(MIN_SIZE,o.width+dx); height=Math.max(MIN_SIZE,o.height+dy) }
  else if (hid==='sw') { x=o.x+dx; width=Math.max(MIN_SIZE,o.width-dx); height=Math.max(MIN_SIZE,o.height+dy) }
  else if (hid==='ne') { y=o.y+dy; width=Math.max(MIN_SIZE,o.width+dx); height=Math.max(MIN_SIZE,o.height-dy) }
  else if (hid==='nw') { x=o.x+dx; y=o.y+dy; width=Math.max(MIN_SIZE,o.width-dx); height=Math.max(MIN_SIZE,o.height-dy) }
  else if (hid==='e') { width=Math.max(MIN_SIZE,o.width+dx) }
  else if (hid==='w') { x=o.x+dx; width=Math.max(MIN_SIZE,o.width-dx) }
  else if (hid==='s') { height=Math.max(MIN_SIZE,o.height+dy) }
  else if (hid==='n') { y=o.y+dy; height=Math.max(MIN_SIZE,o.height-dy) }
  return { ...el, x, y, width, height }
}

export default function EditPDF() {
  const canvasRef = useRef(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageImage, setPageImage] = useState(null)
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 })
  const [scale, setScale] = useState(1.5)
  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [tool, setTool] = useState('select')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const dragRef = useRef(null)

  const selectedEl = elements.find((e) => e.id === selectedId) || null

  const deleteSelected = useCallback(() => {
    setElements((prev) => prev.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId) return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      deleteSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, deleteSelected])

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0]; if (!f) return
    setMessage(''); setElements([]); setSelectedId(null); setCurrentPage(1); setPdfFile(f)
    const buf = await f.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: buf }).promise
    setPdfDoc(doc); setPageCount(doc.numPages)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false,
  })

  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    const render = async () => {
      const page = await pdfDoc.getPage(currentPage)
      const viewport = page.getViewport({ scale: 1.5 })
      const oc = document.createElement('canvas')
      oc.width = viewport.width; oc.height = viewport.height
      await page.render({ canvasContext: oc.getContext('2d'), viewport }).promise
      if (cancelled) return
      const bitmap = await createImageBitmap(oc)
      setPageImage(bitmap); setPageSize({ w: viewport.width, h: viewport.height }); setScale(1.5)
    }
    render().catch((err) => setMessage('렌더링 오류: ' + err.message))
    return () => { cancelled = true }
  }, [pdfDoc, currentPage])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !pageImage) return
    canvas.width = pageSize.w; canvas.height = pageSize.h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, pageSize.w, pageSize.h); ctx.drawImage(pageImage, 0, 0)
    elements.forEach((el) => drawElement(ctx, el, el.id === selectedId))
  }, [pageImage, pageSize, elements, selectedId])

  const getCanvasPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX-r.left)*pageSize.w/r.width, y: (e.clientY-r.top)*pageSize.h/r.height }
  }

  const handleMouseDown = (e) => {
    if (!pageImage) return
    const { x, y } = getCanvasPos(e)
    if (tool === 'select') {
      if (selectedEl) {
        const hid = hitHandle(getHandles(selectedEl), x, y)
        if (hid) { dragRef.current = { type: 'handle', hid, startX: x, startY: y, orig: { ...selectedEl } }; return }
      }
      for (let i = elements.length-1; i >= 0; i--) {
        if (hitElement(elements[i], x, y)) {
          setSelectedId(elements[i].id)
          dragRef.current = { type: 'move', startX: x, startY: y, orig: { ...elements[i] } }
          return
        }
      }
      setSelectedId(null); return
    }
    let newEl
    if (tool==='text') newEl = makeText(x,y)
    else if (tool==='rect') newEl = makeRect(x,y)
    else if (tool==='line') newEl = makeLine(x,y)
    else if (tool==='textbox') newEl = makeTextbox(x,y)
    if (newEl) { setElements((p) => [...p, newEl]); setSelectedId(newEl.id); setTool('select') }
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const { x, y } = getCanvasPos(e)
    const d = dragRef.current; const dx = x-d.startX; const dy = y-d.startY
    setElements((prev) => prev.map((el) => {
      if (el.id !== selectedId) return el
      if (d.type === 'move') {
        if (el.kind === 'shape' && el.type === 'line') return { ...el, x: d.orig.x+dx, y: d.orig.y+dy, x2: d.orig.x2+dx, y2: d.orig.y2+dy }
        return { ...el, x: d.orig.x+dx, y: d.orig.y+dy }
      }
      return applyHandle(el, d.orig, d.hid, dx, dy)
    }))
  }

  const handleMouseUp = () => { dragRef.current = null }

  const updateSelected = (key, val) => setElements((p) => p.map((el) => el.id === selectedId ? { ...el, [key]: val } : el))

  const changePage = (dir) => {
    const next = currentPage + dir
    if (next < 1 || next > pageCount) return
    setSelectedId(null); setElements([]); setCurrentPage(next)
  }

  const handleSave = async () => {
    if (!pdfFile) { setMessage('PDF 파일을 먼저 추가해주세요.'); return }
    setLoading(true); setMessage('')
    try {
      const buf = await pdfFile.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      const page = doc.getPages()[currentPage-1]
      const { height: pH } = page.getSize()
      const toY = (cy, eh=0) => pH - cy/scale - eh

      for (const el of elements) {
        if (el.kind === 'text') {
          if (!el.text) continue
          const res = await renderTextToPng(el.text, el.fontSize, el.color)
          if (!res) continue
          const img = await doc.embedPng(res.bytes)
          // baseline at y=fontSize in offscreen canvas; el.y = canvas baseline
          const descPdf = (res.h - el.fontSize) / scale
          page.drawImage(img, {
            x: el.x/scale, y: pH - el.y/scale - descPdf,
            width: res.w/scale, height: res.h/scale,
          })
        } else if (el.kind === 'shape') {
          if (el.type === 'line') {
            page.drawLine({
              start: { x: el.x/scale, y: toY(el.y) }, end: { x: el.x2/scale, y: toY(el.y2) },
              thickness: el.borderWidth/scale, color: hexToRgb(el.borderColor), lineCap: LineCapStyle.Round,
            })
          } else {
            const rh = el.height/scale
            page.drawRectangle({
              x: el.x/scale, y: toY(el.y, rh), width: el.width/scale, height: rh,
              color: el.filled ? hexToRgb(el.fillColor) : undefined,
              borderColor: hexToRgb(el.borderColor), borderWidth: el.borderWidth/scale,
            })
            if (el.text && el.type === 'textbox') {
              const res = await renderTextToPng(el.text, el.fontSize, el.textColor)
              if (res) {
                const img = await doc.embedPng(res.bytes)
                const boxCenterY = toY(el.y, rh) + rh/2
                page.drawImage(img, {
                  x: el.x/scale + 8/scale, y: boxCenterY - res.h/scale/2,
                  width: res.w/scale, height: res.h/scale,
                })
              }
            }
          }
        }
      }

      const bytes = await doc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      Object.assign(document.createElement('a'), { href: url, download: 'edited.pdf' }).click()
      URL.revokeObjectURL(url)
      setMessage('저장 완료! 파일이 다운로드되었습니다.')
    } catch (err) {
      setMessage('오류: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400'
  const labelCls = 'block text-xs text-gray-500 mb-1'

  return (
    <div className="space-y-3">
      {/* 드롭존 */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
        <input {...getInputProps()} />
        {pdfFile ? (
          <div><p className="text-gray-700 font-medium text-sm">{pdfFile.name}</p><p className="text-xs text-gray-400 mt-0.5">총 {pageCount}페이지 · 다른 파일로 바꾸려면 클릭</p></div>
        ) : (
          <p className="text-gray-500">PDF 파일을 드래그하거나 클릭해서 추가하세요</p>
        )}
      </div>

      {pdfDoc && (
        <>
          {/* 툴바 */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {TOOLS.map((t) => (
              <button key={t.key} onClick={() => setTool(t.key)} title={t.label}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${tool===t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <span className="block text-base leading-none">{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>

          {/* 투컬럼 */}
          <div className="flex gap-4 items-start">
            {/* 캔버스 */}
            <div className="flex-1 min-w-0">
              <div className="border border-gray-200 rounded-lg bg-gray-100 p-2 overflow-auto">
                <canvas ref={canvasRef}
                  style={{ maxWidth: '100%', display: 'block', margin: '0 auto', cursor: tool==='select' ? 'default' : 'crosshair' }}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                />
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button onClick={() => changePage(-1)} disabled={currentPage<=1}
                    className="px-3 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← 이전</button>
                  <span className="text-sm text-gray-600">{currentPage} / {pageCount}</span>
                  <button onClick={() => changePage(1)} disabled={currentPage>=pageCount}
                    className="px-3 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">다음 →</button>
                </div>
              </div>
            </div>

            {/* 속성 패널 */}
            <div className="w-64 shrink-0 space-y-3">
              {selectedEl ? (
                <div className="border border-blue-100 bg-blue-50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-700">
                      {selectedEl.kind==='text' ? '텍스트' : selectedEl.type==='line' ? '선' : selectedEl.type==='textbox' ? '텍스트 도형' : '사각형'}
                    </p>
                    <button onClick={deleteSelected} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50">삭제</button>
                  </div>

                  {selectedEl.kind === 'text' && (
                    <div className="space-y-2">
                      <div><label className={labelCls}>텍스트</label><input className={inputCls} value={selectedEl.text} onChange={(e) => updateSelected('text', e.target.value)} /></div>
                      <div><label className={labelCls}>글자 크기</label><input type="number" min={6} max={200} className={inputCls} value={selectedEl.fontSize} onChange={(e) => updateSelected('fontSize', Number(e.target.value))} /></div>
                      <div><label className={labelCls}>색상</label><input type="color" className="w-full h-8 border border-gray-200 rounded cursor-pointer" value={selectedEl.color} onChange={(e) => updateSelected('color', e.target.value)} /></div>
                    </div>
                  )}

                  {selectedEl.kind === 'shape' && selectedEl.type === 'line' && (
                    <div className="space-y-2">
                      <div><label className={labelCls}>선 색상</label><input type="color" className="w-full h-8 border border-gray-200 rounded cursor-pointer" value={selectedEl.borderColor} onChange={(e) => updateSelected('borderColor', e.target.value)} /></div>
                      <div><label className={labelCls}>두께</label><input type="number" min={1} max={30} className={inputCls} value={selectedEl.borderWidth} onChange={(e) => updateSelected('borderWidth', Number(e.target.value))} /></div>
                    </div>
                  )}

                  {selectedEl.kind === 'shape' && selectedEl.type !== 'line' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>너비</label><input type="number" min={MIN_SIZE} className={inputCls} value={Math.round(selectedEl.width)} onChange={(e) => updateSelected('width', Number(e.target.value))} /></div>
                        <div><label className={labelCls}>높이</label><input type="number" min={MIN_SIZE} className={inputCls} value={Math.round(selectedEl.height)} onChange={(e) => updateSelected('height', Number(e.target.value))} /></div>
                      </div>
                      <div><label className={labelCls}>채우기 색상</label><input type="color" className="w-full h-8 border border-gray-200 rounded cursor-pointer" value={selectedEl.fillColor} onChange={(e) => updateSelected('fillColor', e.target.value)} /></div>
                      <div><label className={labelCls}>테두리 색상</label><input type="color" className="w-full h-8 border border-gray-200 rounded cursor-pointer" value={selectedEl.borderColor} onChange={(e) => updateSelected('borderColor', e.target.value)} /></div>
                      <div><label className={labelCls}>테두리 두께</label><input type="number" min={0} max={20} className={inputCls} value={selectedEl.borderWidth} onChange={(e) => updateSelected('borderWidth', Number(e.target.value))} /></div>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={selectedEl.filled} onChange={(e) => updateSelected('filled', e.target.checked)} />배경 채우기
                      </label>
                      {selectedEl.type === 'textbox' && (
                        <>
                          <div><label className={labelCls}>텍스트</label><input className={inputCls} value={selectedEl.text} onChange={(e) => updateSelected('text', e.target.value)} /></div>
                          <div><label className={labelCls}>글자 크기</label><input type="number" min={6} max={200} className={inputCls} value={selectedEl.fontSize} onChange={(e) => updateSelected('fontSize', Number(e.target.value))} /></div>
                          <div><label className={labelCls}>글자 색상</label><input type="color" className="w-full h-8 border border-gray-200 rounded cursor-pointer" value={selectedEl.textColor} onChange={(e) => updateSelected('textColor', e.target.value)} /></div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400">도구를 선택하고 캔버스를 클릭해 요소를 추가하세요</p>
                  <p className="text-xs text-gray-300 mt-1">선택 후 Delete 키로 삭제</p>
                </div>
              )}

              <button onClick={handleSave} disabled={loading || !pdfFile}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                {loading ? '처리 중...' : 'PDF 저장 및 다운로드'}
              </button>
            </div>
          </div>

          {message && (
            <p className={`text-sm text-center ${message.includes('오류')||message.includes('먼저') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
          )}
        </>
      )}

      {!pdfDoc && (
        <button disabled className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed text-sm">PDF 저장 및 다운로드</button>
      )}
    </div>
  )
}
