import { test, expect, vi } from 'vitest'
import { PDFDocument, degrees, setLineWidth } from 'pdf-lib'
import { exportPdf, runSave } from '../src/lib/exportDoc.js'
import { makeRect, makePipe, makeText } from '../src/lib/geometry.js'

const ONE_PX_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

async function makePdfBytes() {
  const d = await PDFDocument.create()
  d.addPage([600, 800])
  const rotated = d.addPage([400, 300])
  rotated.setRotation(degrees(90))
  d.addPage([600, 800])
  return new Uint8Array(await d.save())
}

const pdfSource = async () => ({ kind: 'pdf', name: '3층 도면.pdf', pageCount: 3, bytes: await makePdfBytes() })
const red = '#DC2626'
const rect = () => makeRect({ x: 50, y: 50 }, { x: 150, y: 120 }, red)
const bend = () => makePipe({ x: 20, y: 20 }, { x: 200, y: 100 }, red, true)
const pageCountOf = async (bytes) => (await PDFDocument.load(bytes)).getPageCount()

test('전체 페이지를 고르면 3장짜리 PDF가 나온다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 0: [rect()] }, pages: [0, 1, 2] })
  expect(await pageCountOf(bytes)).toBe(3)
})

test('한 페이지만 고르면 1장짜리 PDF가 나온다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 1: [rect()] }, pages: [1] })
  expect(await pageCountOf(bytes)).toBe(1)
})

test('도형을 얹으면 원본보다 내용이 늘어난다', async () => {
  const source = await pdfSource()
  const plain = await exportPdf({ source, objectsByPage: {}, pages: [0] })
  const drawn = await exportPdf({ source, objectsByPage: { 0: [rect(), bend()] }, pages: [0] })
  expect(drawn.length).toBeGreaterThan(plain.length)
})

test('회전된 페이지에 도형을 얹어도 열린다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 1: [rect(), bend()] }, pages: [0, 1, 2] })
  const doc = await PDFDocument.load(bytes)
  expect(doc.getPage(1).getRotation().angle).toBe(90)
})

test('저장하지 않는 페이지의 도형은 무시된다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 0: [rect()] }, pages: [2] })
  expect(await pageCountOf(bytes)).toBe(1)
})

test('글씨는 renderText가 만든 그림으로 얹힌다', async () => {
  const renderText = vi.fn(async () => ({ bytes: ONE_PX_PNG, wPt: 40, hPt: 20 }))
  const t = makeText({ x: 30, y: 30 }, '덕트', red)
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 0: [t] }, pages: [0], renderText })
  expect(renderText).toHaveBeenCalledWith(t)
  expect(await pageCountOf(bytes)).toBe(1)
})

test('이미지 도면은 한 페이지짜리 PDF가 된다', async () => {
  const source = { kind: 'image', name: '현장.png', mime: 'image/png', pageCount: 1, bytes: ONE_PX_PNG }
  const bytes = await exportPdf({ source, objectsByPage: { 0: [rect()] }, pages: [0] })
  const doc = await PDFDocument.load(bytes)
  expect(doc.getPageCount()).toBe(1)
  expect(doc.getPage(0).getSize()).toEqual({ width: 1, height: 1 })
})

function fakeDeps() {
  return {
    download: vi.fn(),
    exportPng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  }
}

test('전체 저장: 한글 파일 이름 + _편집.pdf', async () => {
  const deps = fakeDeps()
  const source = await pdfSource()
  const r = await runSave({ source, objectsByPage: {}, scope: 'all', format: 'pdf', currentPage: 0, modified: [] }, deps)
  expect(r.filename).toBe('3층 도면_편집.pdf')
  expect(deps.download).toHaveBeenCalledWith(expect.any(Blob), '3층 도면_편집.pdf')
})

test('수정한 페이지만 저장하면 그 장수만큼의 PDF가 된다', async () => {
  const deps = fakeDeps()
  const source = await pdfSource()
  await runSave({ source, objectsByPage: { 0: [rect()], 2: [rect()] }, scope: 'modified', format: 'pdf', currentPage: 0, modified: [0, 2] }, deps)
  const blob = deps.download.mock.calls[0][0]
  expect(await pageCountOf(new Uint8Array(await blob.arrayBuffer()))).toBe(2)
})

test('지금 보는 한 장을 PDF로 저장하면 이름에 장 번호가 붙는다', async () => {
  const deps = fakeDeps()
  const source = await pdfSource()
  const r = await runSave({ source, objectsByPage: {}, scope: 'one', format: 'pdf', currentPage: 1, modified: [] }, deps)
  expect(r.filename).toBe('3층 도면_편집_2장.pdf')
})

test('지금 보는 한 장을 이미지로 저장하면 PNG가 된다', async () => {
  const deps = fakeDeps()
  const source = await pdfSource()
  const r = await runSave({ source, objectsByPage: {}, scope: 'one', format: 'png', currentPage: 2, modified: [] }, deps)
  expect(r.filename).toBe('3층 도면_편집_3장.png')
  expect(deps.exportPng).toHaveBeenCalledTimes(1)
})

test('이미지 도면을 저장하면 장 번호 없이 이름이 붙는다', async () => {
  const deps = fakeDeps()
  const source = { kind: 'image', name: '현장.png', mime: 'image/png', pageCount: 1, bytes: ONE_PX_PNG }
  const r = await runSave({ source, objectsByPage: {}, scope: 'one', format: 'png', currentPage: 0, modified: [] }, deps)
  expect(r.filename).toBe('현장_편집.png')
})

import { PDFName, PDFRawStream, PDFArray, decodePDFRawStream } from 'pdf-lib'

async function contentOf(bytes, pageIndex) {
  const doc = await PDFDocument.load(bytes)
  let contents = doc.getPage(pageIndex).node.Contents()
  const streams = contents instanceof PDFArray ? contents.asArray().map((r) => doc.context.lookup(r)) : [contents]
  return streams
    .filter((s) => s instanceof PDFRawStream)
    .map((s) => new TextDecoder('latin1').decode(decodePDFRawStream(s).decode()))
    .join('\n')
}

test('공조는 안을 채운 네모로 저장되고 꼭짓점이 PDF 좌표로 변환된다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 0: [rect()] }, pages: [0] })
  const text = await contentOf(bytes, 0)
  expect(text).toMatch(/50 -750 m/)
  expect(text).toMatch(/\bf\b|\bB\b|\bb\b/)
})

test('회전 90도 페이지의 공조 꼭짓점이 PDF 좌표로 변환된다', async () => {
  const bytes = await exportPdf({ source: await pdfSource(), objectsByPage: { 1: [rect()] }, pages: [1] })
  const text = await contentOf(bytes, 0)
  // 회전 90: 화면 (50,50) -> PDF (50,50). drawSvgPath 가 y 를 뒤집어 쓰므로 스트림에는 -y 로 적힌다
  expect(text).toMatch(/50 -50 m/)
  // 화면 (150,50) -> PDF (50,150)
  expect(text).toMatch(/50 -150 l/)
})

test('저장하면 저장한 페이지 번호도 돌려준다', async () => {
  const deps = fakeDeps()
  const source = await pdfSource()
  const r = await runSave({ source, objectsByPage: {}, scope: 'modified', format: 'pdf', currentPage: 0, modified: [0, 2] }, deps)
  expect(r.pages).toEqual([0, 2])
})

test('원본 내용을 q/Q로 감싸 원본이 남긴 선 굵기가 새 도형에 새지 않는다', async () => {
  const d = await PDFDocument.create()
  const p = d.addPage([600, 800])
  p.pushOperators(setLineWidth(9)) // 닫지 않은 상태 변경을 남기는 원본
  const source = { kind: 'pdf', name: 'a.pdf', pageCount: 1, bytes: new Uint8Array(await d.save()) }
  const bytes = await exportPdf({ source, objectsByPage: { 0: [rect()] }, pages: [0] })
  const text = await contentOf(bytes, 0)
  expect(text).toMatch(/9 w\s+Q(\s+Q)?\s+q/)
})
