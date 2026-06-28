import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { PDFDocument } from 'pdf-lib'

export default function SplitPDF() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [ranges, setRanges] = useState([{ from: '', to: '', name: '' }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setMessage('')
    const buf = await f.arrayBuffer()
    const doc = await PDFDocument.load(buf)
    setPageCount(doc.getPageCount())
    setRanges([{ from: '1', to: String(doc.getPageCount()), name: '' }])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  const updateRange = (idx, key, val) => {
    setRanges((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val }
      return next
    })
  }

  const addRange = () => setRanges((prev) => [...prev, { from: '', to: '', name: '' }])
  const removeRange = (idx) => setRanges((prev) => prev.filter((_, i) => i !== idx))

  const handleSplit = async () => {
    if (!file) { setMessage('PDF 파일을 먼저 추가해주세요.'); return }
    for (const r of ranges) {
      const from = parseInt(r.from)
      const to = parseInt(r.to)
      if (!from || !to || from < 1 || to > pageCount || from > to) {
        setMessage(`유효하지 않은 페이지 범위가 있습니다. (1 ~ ${pageCount})`)
        return
      }
    }
    setLoading(true)
    setMessage('')
    try {
      const buf = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(buf)
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i]
        const from = parseInt(r.from) - 1
        const to = parseInt(r.to) - 1
        const newDoc = await PDFDocument.create()
        const indices = Array.from({ length: to - from + 1 }, (_, k) => from + k)
        const pages = await newDoc.copyPages(srcDoc, indices)
        pages.forEach((p) => newDoc.addPage(p))
        const bytes = await newDoc.save()
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = r.name ? `${r.name}.pdf` : `split_${i + 1}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
      setMessage(`${ranges.length}개 파일로 분리 완료! 다운로드되었습니다.`)
    } catch (e) {
      setMessage('오류가 발생했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div>
            <p className="text-gray-700 font-medium">{file.name}</p>
            <p className="text-sm text-gray-400 mt-1">총 {pageCount}페이지 · 다른 파일로 바꾸려면 클릭</p>
          </div>
        ) : (
          <p className="text-gray-500">
            {isDragActive ? 'PDF 파일을 여기에 놓으세요' : 'PDF 파일을 드래그하거나 클릭해서 추가하세요'}
          </p>
        )}
      </div>

      {file && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">페이지 범위 설정</p>
            <button
              onClick={addRange}
              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
            >
              + 범위 추가
            </button>
          </div>
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 w-14 shrink-0">파일 {i + 1}</span>
              <input
                type="number"
                min={1}
                max={pageCount}
                value={r.from}
                onChange={(e) => updateRange(i, 'from', e.target.value)}
                placeholder="시작"
                className="w-16 text-sm border border-gray-200 rounded px-2 py-1 text-center"
              />
              <span className="text-gray-400 text-sm">~</span>
              <input
                type="number"
                min={1}
                max={pageCount}
                value={r.to}
                onChange={(e) => updateRange(i, 'to', e.target.value)}
                placeholder="끝"
                className="w-16 text-sm border border-gray-200 rounded px-2 py-1 text-center"
              />
              <span className="text-gray-400 text-xs">페이지</span>
              <input
                type="text"
                value={r.name}
                onChange={(e) => updateRange(i, 'name', e.target.value)}
                placeholder="파일명 (선택)"
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1"
              />
              {ranges.length > 1 && (
                <button
                  onClick={() => removeRange(i)}
                  className="text-red-400 hover:text-red-600 text-sm px-1"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSplit}
        disabled={loading || !file}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '처리 중...' : 'PDF 분리하기'}
      </button>

      {message && (
        <p className={`text-sm text-center ${message.includes('오류') || message.includes('유효') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
