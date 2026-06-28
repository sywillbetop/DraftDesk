import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { PDFDocument } from 'pdf-lib'

export default function MergePDF() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [...prev, ...accepted])
    setMessage('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveFile = (idx, dir) => {
    setFiles((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return next
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      setMessage('PDF 파일을 2개 이상 추가해주세요.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const buf = await file.arrayBuffer()
        const doc = await PDFDocument.load(buf)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach((p) => merged.addPage(p))
      }
      const bytes = await merged.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setMessage('합치기 완료! 파일이 다운로드되었습니다.')
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
        <p className="text-gray-500">
          {isDragActive ? 'PDF 파일을 여기에 놓으세요' : 'PDF 파일을 드래그하거나 클릭해서 추가하세요'}
        </p>
        <p className="text-sm text-gray-400 mt-1">여러 파일 동시 선택 가능</p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm">
              <span className="flex-1 truncate text-gray-700">{f.name}</span>
              <button
                onClick={() => moveFile(i, -1)}
                disabled={i === 0}
                className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30"
              >↑</button>
              <button
                onClick={() => moveFile(i, 1)}
                disabled={i === files.length - 1}
                className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30"
              >↓</button>
              <button
                onClick={() => removeFile(i)}
                className="px-1.5 py-0.5 text-xs bg-white border border-red-200 text-red-500 rounded hover:bg-red-50"
              >✕</button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleMerge}
        disabled={loading || files.length < 2}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '처리 중...' : `PDF 합치기 (${files.length}개)`}
      </button>

      {message && (
        <p className={`text-sm text-center ${message.includes('오류') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
