import { useState } from 'react'
import MergePDF from './components/MergePDF'
import SplitPDF from './components/SplitPDF'
import EditPDF from './components/EditPDF'
import ImageEdit from './components/ImageEdit'

const MENUS = [
  { key: 'merge', label: 'PDF 합치기', icon: '🔗', desc: '여러 PDF를 하나로 합칩니다' },
  { key: 'split', label: 'PDF 분리', icon: '✂️', desc: '페이지 범위별로 분리합니다' },
  { key: 'edit', label: 'PDF 편집', icon: '✏️', desc: '텍스트·이미지·도형을 삽입합니다' },
  { key: 'image', label: '이미지 편집', icon: '🖼️', desc: '이미지에 텍스트·도형을 추가합니다' },
]

export default function App() {
  const [active, setActive] = useState('merge')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-800">PDF Editor</h1>
          <p className="text-xs text-gray-400 mt-0.5">브라우저에서 바로 편집</p>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {MENUS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                active === m.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="mr-2">{m.icon}</span>
              <span className="text-sm font-medium">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">모든 처리는 브라우저에서 이루어집니다. 파일이 서버로 전송되지 않습니다.</p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className={active === 'edit' || active === 'image' ? 'max-w-5xl mx-auto' : 'max-w-xl mx-auto'}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {MENUS.find((m) => m.key === active)?.icon}{' '}
              {MENUS.find((m) => m.key === active)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {MENUS.find((m) => m.key === active)?.desc}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {active === 'merge' && <MergePDF />}
            {active === 'split' && <SplitPDF />}
            {active === 'edit' && <EditPDF />}
            {active === 'image' && <ImageEdit />}
          </div>
        </div>
      </main>
    </div>
  )
}
