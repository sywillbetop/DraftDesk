# DraftDesk 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 환갑 넘은 공조 설치 기사님이 PDF/이미지 도면 위에 공조(네모)·배관(직선·꺾기)·글씨를 그려 넣고 저장하는, 아주 쉬운 서버 없는 웹 앱을 Vue 3로 새로 만든다.

**Architecture:** 순수 로직(`src/lib/*`)과 화면(`src/components/*`)을 분리한다. 도형은 "화면에 보이는 모양(회전 반영) 기준 좌표, 원점 좌상단, 단위 pt"로 페이지별 배열에 저장하고, 저장 때만 PDF 좌표로 변환한다. 렌더링은 pdfjs-dist(보는 페이지만), 저장은 pdf-lib로 원본 PDF 위에 얹는다.

**Tech Stack:** Vue 3 (`<script setup>`, JavaScript), Vite, Vitest, pdfjs-dist, pdf-lib. Pinia 등 상태 라이브러리와 Tailwind는 쓰지 않는다(직접 CSS).

**Spec:** `docs/superpowers/specs/2026-11-02-draftdesk-redesign-design.md`

## Global Constraints

- 서버 없음, GitHub Pages 배포(`vite build`, `base: './'`), 파일은 브라우저 밖으로 나가지 않는다.
- Python 사용 안 함. Vue 3 + JavaScript.
- 버튼 글씨 20px 이상, 모든 클릭 영역 최소 48px 높이, 도면 확대 최대 400%.
- 위쪽 버튼 줄 순서: **도면 열기 / 공조 / 배관(직선) / 배관(꺾기) / 글씨 / 저장** (한 줄, 1280×720에서도 한 줄).
- 8색 팔레트(도면과 구분되는 색), 마지막 선택 색은 localStorage에 기억.
- 기본 글씨 16개 정확히: 덕트, 2웨이, 4웨이, 환기구, 급기, 배기, 에어컨, 실외기, 냉매관, 배수관, 드레인, 보온, 상향, 하향, 천장, 벽체.
- 저장 파일 이름: 원본 이름(확장자 제외) + `_편집` + 확장자. 한 장 이미지는 PNG. 원본 덮어쓰기 없음.
- 저장 범위: 전체 페이지 / 수정한 페이지만(도형이 있는 페이지, "(N장)" 표시) / 지금 보는 한 장만. **형식(PDF/PNG) 선택은 "한 장만"일 때만.**
- PDF 렌더링 워커·폰트는 CDN이 아니라 번들에 포함. 임시 저장·합치기·분리·로그인은 만들지 않는다.
- 모든 화면 문구는 한국어.

## Review Focus

- 회전된(90/180/270) 또는 크기가 서로 다른 PDF 페이지: 저장한 도형 위치가 화면과 같아야 한다 → Task 3, 7
- PDF가 아닌 파일·깨진 PDF·암호 걸린 PDF를 열면 크게 "이 파일은 열 수 없습니다"라고 알리고 기존 작업을 유지 → Task 4
- 클릭만 하고 끌지 않았을 때 크기 0 도형이 생기면 안 된다(너무 작으면 취소) → Task 3, 5
- localStorage가 막혔거나 저장된 JSON이 깨져도 앱이 열리고 기본 글씨 16개가 나온다 → Task 2
- 도형이 하나도 없는데 "수정한 페이지만"을 고르려는 경우(비활성화), 한 장짜리 PDF에서 겹치는 범위 선택지 숨김 → Task 2, 7
- 한글·공백이 들어간 파일 이름, 빈 글씨/공백만 입력한 글씨는 목록에 추가되지 않는다 → Task 2

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/palette.js` | 8색 팔레트, 마지막 색 기억 |
| `src/lib/phrases.js` | 기본 글씨 16개, localStorage 목록 관리 |
| `src/lib/fileName.js` | 저장 파일 이름 만들기 |
| `src/lib/saveScope.js` | 수정한 페이지 계산, 저장 선택지 계산 |
| `src/lib/geometry.js` | 도형 생성·꺾기 계산·맞히기·손잡이·크기 조절·좌표 변환 |
| `src/lib/source.js` | 파일 열기(PDF/이미지), 페이지 렌더링(pdfjs) |
| `src/lib/exportDoc.js` | PDF/PNG 내보내기 |
| `src/composables/useDocument.js` | 열린 도면·페이지별 도형·선택·줌·도구 상태 |
| `src/components/*.vue` | `TopBar`, `ColorPalette`, `PhraseBar`, `SelectionBar`, `PageCanvas`, `PageNav`, `SaveDialog`, `ConfirmDialog`, `Toast` |
| `src/App.vue`, `src/main.js`, `src/style.css` | 조립, 전역 큰 글씨 스타일 |

기존 React 파일(`src/App.jsx`, `src/components/*.jsx`, `src/*.css`, `tailwind.config.js`, `postcss.config.js`, `.oxlintrc.json` 등)은 Task 1에서 삭제한다.

---

### Task 1: Vue 3 + Vite + Vitest 뼈대로 교체

**Files:**
- Modify: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `README.md`
- Create: `src/main.js`, `src/App.vue`, `src/style.css`, `vitest.config.js`, `tests/smoke.test.js`
- Delete: `src/App.jsx`, `src/main.jsx`, `src/components/*.jsx`, `src/App.css`, `src/index.css`, `src/assets/*`, `tailwind.config.js`, `postcss.config.js`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test`(vitest run), `npm run deploy`(기존 gh-pages 흐름 유지). `src/App.vue`는 이후 Task에서 조립.

- [ ] **Step 1: 의존성 교체** — react·tailwind·react-dropzone·autoprefixer·postcss·oxlint 제거, `vue`, `@vitejs/plugin-vue`, `vitest`, `jsdom`, `pdfjs-dist`, `pdf-lib` 설치. `package.json` name은 `draftdesk`.
- [ ] **Step 2: 설정** — `vite.config.js`는 `plugins:[vue()]`, `base:'./'`. `vitest.config.js`는 environment `jsdom`.
- [ ] **Step 3: 스모크 테스트 작성** — `tests/smoke.test.js`: `expect(1+1).toBe(2)` 로 vitest 동작만 확인. 실행: `npx vitest run` → PASS.
- [ ] **Step 4: 빈 앱** — `index.html` title `도면편집기`, `App.vue`는 "도면편집기" 제목만. `style.css`에 전역 `html{font-size:20px}`, `button{min-height:48px;font-size:1rem}`.
- [ ] **Step 5: 확인** — `npm run build` 성공, `npm run dev`로 빈 화면 열림. 
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: Vue 3 + Vitest 뼈대로 교체"`

### Task 2: 순수 로직 — 팔레트·글씨 목록·파일명·저장 범위

**Files:**
- Create: `src/lib/palette.js`, `src/lib/phrases.js`, `src/lib/fileName.js`, `src/lib/saveScope.js`
- Test: `tests/palette.test.js`, `tests/phrases.test.js`, `tests/fileName.test.js`, `tests/saveScope.test.js`

**Interfaces:**
- Produces:
  - `PALETTE: string[8]` (hex), `loadColor(): string`, `saveColor(hex: string): void` (palette에 없는 값·storage 오류 시 `PALETTE[0]`).
  - `DEFAULT_PHRASES: string[16]`, `loadPhrases(): string[]`, `addPhrase(list: string[], text: string): string[]` (trim, 빈 문자열이면 변경 없음, 중복이면 앞으로 이동하지 않고 변경 없음, 새 말은 맨 뒤), `removePhrase(list, text): string[]`, `savePhrases(list): void`.
  - `editedName(originalName: string, ext: 'pdf'|'png', pageNumber?: number): string` — `"3층 도면.pdf"`→`"3층 도면_편집.pdf"`. `pageNumber`는 한 장 저장일 때 `"3층 도면_편집_3장.png"`처럼 붙인다. 확장자 없는 이름, 점이 여러 개인 이름 처리.
  - `modifiedPages(objectsByPage: Record<number, object[]>): number[]` (오름차순, 도형 1개 이상인 페이지 인덱스, 0부터).
  - `saveOptions({ pageCount: number, isImage: boolean, modified: number[] }): { scopes: Array<'all'|'modified'|'one'>, disabled: Array<'modified'> , formatChoiceFor: Array<'one'|'image'> }` — 이미지 도면이면 scopes `['one']`뿐이고 형식 선택(PDF/PNG) 노출. 한 장짜리 PDF면 scopes `['one']`뿐. 그 외 `['all','modified','one']`, 수정한 페이지가 없으면 `disabled:['modified']`.
- 팔레트 구체 색은 구현자가 고르되 검정·회색 계열 제외, 흰 배경에서 WCAG 3:1 이상.

- [ ] **Step 1: 실패하는 테스트** — `phrases.test.js`: `DEFAULT_PHRASES.length===16`, 첫 항목 `'덕트'`·마지막 `'벽체'`; `addPhrase(list,'  ')`는 같은 목록; `addPhrase(['덕트'],'덕트')`는 길이 1; `loadPhrases()`는 localStorage에 `'{깨진json'`이 들어 있어도 `DEFAULT_PHRASES` 반환. `palette.test.js`: `PALETTE.length===8`, 잘못된 저장값이면 `loadColor()===PALETTE[0]`. `fileName.test.js`: 위 예시 3개 + `'도면'`→`'도면_편집.pdf'`. `saveScope.test.js`: 위 `saveOptions` 4가지 경우 + `modifiedPages({0:[],2:[{}]})` → `[2]`.
- [ ] **Step 2: 실패 확인** — `npx vitest run` → 모듈 없음으로 FAIL.
- [ ] **Step 3: 구현** — 위 시그니처대로. storage 접근은 모두 try/catch.
- [ ] **Step 4: 통과 확인** — `npx vitest run` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: 팔레트·글씨 목록·파일명·저장 범위 로직"`

### Task 3: 도형 모델과 기하

**Files:**
- Create: `src/lib/geometry.js`
- Test: `tests/geometry.test.js`

**Interfaces:**
- Produces (모든 좌표는 "화면에 보이는 페이지 기준, 좌상단 원점, pt"):
  - 객체 타입: `{id, type:'rect', x,y,w,h, color}` / `{id, type:'pipe', x1,y1,x2,y2, bend:boolean, flip:boolean, color}` / `{id, type:'text', x,y, text, size, color}`.
  - `newId(): number`
  - `makeRect(a:{x,y}, b:{x,y}, color): object|null` — 정규화(w,h 양수), 가로·세로 중 하나라도 `MIN_SIZE=10` 미만이면 `null`.
  - `makePipe(a, b, color, bend: boolean): object|null` — 두 점 거리 `MIN_SIZE` 미만이면 `null`.
  - `makeText(at:{x,y}, text, color, size=24): object`
  - `pipePoints(p): Array<{x,y}>` — 직선이면 2점. 꺾기는 3점: 기본(`flip=false`)은 `(x1,y1)→(x2,y1)→(x2,y2)`(가로 먼저), `flip=true`는 `(x1,y1)→(x1,y2)→(x2,y2)`(세로 먼저).
  - `PIPE_WIDTH = 6` (굵은 선, pt)
  - `hitTest(obj, pt, tolerance=8): boolean` — 공조는 내부 포함, 배관은 `pipePoints` 모든 선분과의 거리, 글씨는 `size`·글자 수로 추정한 사각형(글자 폭 = `size*0.6`, 한글은 `size`).
  - `handlesOf(obj): Array<{id:string,x,y}>` — 공조 8개(`nw,n,ne,e,se,s,sw,w`), 배관 2개(`p1,p2`), 글씨 0개.
  - `hitHandle(obj, pt, radius=12): string|null`
  - `moveObject(obj, dx, dy): object`, `resizeByHandle(obj, handleId, pt): object` (공조는 최소 `MIN_SIZE` 유지, 배관은 끝점 이동).
  - `flipBend(obj): object` (배관만 `flip` 토글), `setColor(obj, hex)`, `setTextSize(obj, size)` (6~200로 clamp).
  - `viewToPdf(pt:{x,y}, page:{w:number,h:number,rotation:0|90|180|270}): {x,y}` — `w,h`는 회전 전 PDF 크기(pdf-lib `getSize`). 변환식: rot0 `(x, h-y)`, rot90 `(y, x)`, rot180 `(w-x, y)`, rot270 `(w-y, h-x)`.
  - `viewSize(page): {w,h}` — rot 90/270이면 `w,h` 맞바꿈.

- [ ] **Step 1: 실패하는 테스트** — `makeRect({x:50,y:50},{x:10,y:20},'#f00')` → `{x:10,y:20,w:40,h:30}`; `makeRect({x:0,y:0},{x:3,y:300},c)` → `null`; `pipePoints`(꺾기, flip false/true) 점 3개 값 단정; `hitTest` 배관 꺾인 지점 위 true / 멀리 false; `resizeByHandle` 로 `w`가 `MIN_SIZE` 아래로 안 내려감; `viewToPdf` 4방향: 페이지 `{w:200,h:100}`에서 `rotation:90` 이면 `viewSize`가 `{w:100,h:200}` 이고 view `(0,0)`→pdf `(0,0)`, view `(100,0)`→pdf `(0,100)`; rot270에서 view `(0,0)`→pdf `(200,100)`. 네 방향 모두 view 네 모서리가 pdf 좌표 범위 `0..w, 0..h` 안으로 변환되는지도 검증.
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/geometry.test.js` → FAIL.
- [ ] **Step 3: 구현** — 위 시그니처대로, 객체는 불변(새 객체 반환).
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: 도형 모델·꺾기·맞히기·좌표 변환"`

### Task 4: 도면 열기와 상태(useDocument)

**Files:**
- Create: `src/lib/source.js`, `src/composables/useDocument.js`
- Test: `tests/useDocument.test.js`, `tests/source.test.js`

**Interfaces:**
- Consumes: Task 2 `modifiedPages`, Task 3 도형 타입.
- Produces:
  - `openSource(file: File): Promise<Source>` — `Source = { kind:'pdf'|'image', name:string, pageCount:number, bytes:Uint8Array|null, renderPage(index:number, scale:number): Promise<{canvas:HTMLCanvasElement|ImageBitmap, viewW:number, viewH:number, page:{w,h,rotation}}> }`. PDF는 pdfjs, 이미지는 `<img>` 로드(`pageCount=1`, 크기=원본 픽셀, rotation 0). 열 수 없으면 `Error('OPEN_FAILED')`. pdfjs 워커는 `?url` 로 번들 포함(`pdfjs-dist/build/pdf.worker.min.mjs?url`).
  - `useDocument()` 반환: `{ source, currentPage, zoom, objectsByPage, selectedId, tool, color, hasUnsaved, openFile(file), setPage(i), setZoom(z), setTool(t), add(obj), update(id, fn), remove(id), select(id), selected, modified }`.
    - `tool`: `'select'|'rect'|'pipe'|'bend'|'text'`; 도형 하나 추가되면 `tool='select'`로 돌아간다.
    - `zoom`은 0.25~4(=400%)로 clamp, 기본은 `'fit'`로 표시 컴포넌트가 계산.
    - 페이지를 바꿔도 `objectsByPage` 유지. 새 파일을 열면 초기화(`openFile`은 확인 후 호출되는 것이 App의 책임).
    - `hasUnsaved`: 도형이 하나라도 있으면 true, 저장 성공 후 false.
    - 열기 실패 시 기존 상태를 건드리지 않고 `Error` 를 그대로 던진다.

- [ ] **Step 1: 실패하는 테스트** — `useDocument`: `add` 후 `modified` 가 `[currentPage]`, 페이지 이동 후 돌아와도 도형 유지, `add` 후 `tool==='select'`, `setZoom(9)`→4, 도형 전부 `remove` 하면 `modified` 비고 `hasUnsaved` false. `openSource`: `new File(['not a pdf'],'a.pdf')` → `OPEN_FAILED` 로 reject.
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 위 시그니처대로. `openSource` 는 pdfjs `getDocument({data})`, 암호 PDF는 `PasswordException` 도 `OPEN_FAILED` 로 변환.
- [ ] **Step 4: 통과 확인** — PASS (`pdfjs` 를 쓰는 렌더 테스트는 만들지 않고 Task 5 수동 확인으로 대신한다).
- [ ] **Step 5: Commit** — `git commit -m "feat: 도면 열기·문서 상태"`

### Task 5: 도면 화면(PageCanvas) — 보기·그리기·고르기·옮기기·확대·이동

**Files:**
- Create: `src/components/PageCanvas.vue`
- Modify: `src/App.vue`(임시 연결)

**Interfaces:**
- Consumes: `useDocument()` 인스턴스(prop `doc`), Task 3 함수.
- Produces: `<PageCanvas :doc="doc" />` — 이벤트 없음, 상태는 모두 `doc`를 통해 바꾼다.

동작(스펙 4.3, 4.5, 4.7 그대로):
- 현재 페이지를 `source.renderPage` 로 한 장만 그린다(페이지를 바꿀 때 다시 그림). 처음은 화면 너비에 맞춤, `zoom` 숫자가 있으면 그 배율. 도형은 별도 오버레이 `<canvas>`(또는 SVG)에 같은 배율로 그린다.
- 도구가 `rect/pipe/bend`면 끌어서 그리기(`makeRect/makePipe`, `null`이면 무시), `text`면 클릭한 지점에 `doc.pendingText`(PhraseBar가 설정)를 `makeText`로 붙이고 `pendingText`는 유지(여러 번 붙이기 가능하되 도구는 `select`로 복귀하지 않음). 그 외 도형은 하나 놓으면 `select`로 복귀.
- `select`일 때: 선택된 도형의 손잡이 → 크기 조절, 도형 위 → 선택·옮기기, 빈 곳 끌기 → 화면 이동(스크롤 위치 이동). 선택된 도형은 점선 테두리+큰 손잡이(지름 12pt 이상).
- 마우스 휠은 Ctrl 없이도 확대·축소(보조 기능), 최대 400%.
- 현재 도구가 켜져 있으면 커서를 십자로.

- [ ] **Step 1: 구현** — 위 동작대로. 좌표 변환은 `(clientX-rect.left)/scale` 로 화면→pt.
- [ ] **Step 2: 수동 확인(브라우저)** — `npm run dev`, 임시로 `App.vue`에 파일 선택 input 하나 두고: 3페이지 이상 PDF를 열어 ① 페이지 넘겨도 그림 유지 ② 공조를 끌어서 그림 ③ 클릭만 하면 아무것도 안 생김 ④ 손잡이로 크기 변경 ⑤ 400% 확대 후 빈 곳 끌어 이동. 90도 회전된 PDF 한 개로도 화면이 똑바로 나오는지 확인.
- [ ] **Step 3: Commit** — `git commit -m "feat: 도면 화면 그리기·고르기·이동·확대"`

### Task 6: 큰 버튼 UI 조립

**Files:**
- Create: `src/components/TopBar.vue`, `ColorPalette.vue`, `PhraseBar.vue`, `SelectionBar.vue`, `PageNav.vue`, `Toast.vue`
- Modify: `src/App.vue`, `src/style.css`
- Test: `tests/phraseBar.test.js` (`@vue/test-utils` 설치)

**Interfaces:**
- Consumes: `useDocument()`, Task 2 `loadPhrases/addPhrase/removePhrase/savePhrases`, `PALETTE/loadColor/saveColor`.
- Produces: `App.vue` 가 `doc = useDocument()` 를 만들어 하위에 내려준다. `TopBar` 는 이벤트 `open`, `save` 를 올린다.

동작:
- `TopBar`: 6개 버튼을 스펙 순서로. 켜진 도구는 진한 배경. 도면이 없으면 공조~저장은 비활성(흐리게 + "먼저 도면을 열어 주세요" 안내 문구).
- 도면이 없을 때 가운데에 큰 안내("도면 파일을 열어 주세요")와 큰 "도면 열기" 버튼. 파일을 화면에 끌어다 놓아도 열린다(`dragover/drop`, 한 번에 한 파일).
- `ColorPalette`: 공조·배관 도구가 켜져 있거나 공조·배관·글씨가 선택됐을 때 도구 줄 바로 아래 큰 동그라미 8개(지름 40px 이상). 누르면 `doc.color` 변경+`saveColor`, 선택된 도형이 있으면 그 색도 바뀐다.
- `PhraseBar`: 글씨 도구가 켜지면 아래에 입력한 말 큰 버튼들(줄바꿈), 누르면 `doc.pendingText` 설정. "직접 입력" 칸 + "붙이기" 버튼: 입력 후 `addPhrase`·`savePhrases`, 바로 `pendingText` 로 설정. 각 말 옆 작은 "✕"는 지우기(`removePhrase`, 24px 이상이 아니라 **44px**).
- `SelectionBar`: 도형이 선택되면 큰 버튼 줄: 지우기(빨강), 꺾기 배관이면 "방향 바꾸기", 글씨면 "글씨 크게 / 작게".
- `PageNav`: 도면 아래 "◀ 이전 장   3 / 12   다음 장 ▶" + 확대 "－ 작게 / ＋ 크게"(현재 배율 % 표시). 첫/끝 장에서는 해당 버튼 비활성.
- `Toast`: 맨 위 큰 문구(성공 초록 `#166534` 배경 흰 글씨, 오류 빨강). 5초 뒤 사라지되 닫기 버튼(큰) 있음.
- 키보드: 선택된 도형이 있고 입력칸에 포커스가 없을 때 Delete로 지우기.

- [ ] **Step 1: 실패하는 테스트** — `phraseBar.test.js`: 마운트 시 기본 16개 버튼이 보임; 입력칸에 `'  '` 입력 후 붙이기 → 목록 길이 변화 없음; 새 말 입력 → 17개이고 localStorage에 저장됨; "✕" 누르면 목록에서 사라짐.
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 위 동작대로 컴포넌트·스타일 작성. 1280×720 에서 TopBar 한 줄.
- [ ] **Step 4: 통과 확인** — `npx vitest run` PASS.
- [ ] **Step 5: 수동 확인** — 글씨 도구로 "덕트" 붙이기, 직접 입력 붙이기, 색 바꾸기, 방향 바꾸기, 지우기. 브라우저 창을 1280×720 로 줄여 버튼 줄이 한 줄인지 확인.
- [ ] **Step 6: Commit** — `git commit -m "feat: 큰 버튼 UI 조립"`

### Task 7: 저장 — 내보내기와 저장 창

**Files:**
- Create: `src/lib/exportDoc.js`, `src/components/SaveDialog.vue`
- Modify: `src/App.vue`
- Test: `tests/exportDoc.test.js`

**Interfaces:**
- Consumes: Task 2 `saveOptions/modifiedPages/editedName`, Task 3 `viewToPdf/viewSize/pipePoints`, Task 4 `Source`.
- Produces:
  - `exportPdf(args: { source: Source, objectsByPage: Record<number, object[]>, pages: number[] }): Promise<Uint8Array>` — PDF면 `source.bytes` 를 `PDFDocument.load` 해서 원본 페이지를 벡터로 유지한 채 `pages` 에 포함되지 않는 페이지를 제거하고, 남은 페이지에 도형을 얹는다(도형 좌표는 `viewToPdf`, 페이지 회전은 `page.getRotation()`). 이미지 도면이면 원본 해상도 이미지를 한 페이지 PDF로 만든다. 글씨는 canvas로 PNG를 만들어 `drawImage`(한글 폰트 임베드는 이번 범위에서 제외 — 스펙 6장이 허용한 선택, README에 한계로 적는다).
  - `exportPng(args: { source: Source, objects: object[], pageIndex: number }): Promise<Blob>` — 원본 해상도(PDF는 scale 2 이상)에 도형을 합성.
  - `downloadBlob(blob: Blob, filename: string): void`
  - `SaveDialog.vue`: props `doc`, `source`; 이벤트 `done(filename)`, `cancel`. 흐름: 범위 큰 버튼 → (한 장일 때만) 형식 큰 버튼 → "저장" 큰 버튼. 범위 문구: "전체 페이지(12장)", "수정한 페이지만(3장)", "지금 보는 페이지만(3장)". "수정한 페이지만"이 비활성이면 이유 문구 "아직 그린 것이 없습니다". 저장 중에는 "저장 중입니다…" 큰 문구와 버튼 잠금.
  - 저장 성공 시 App이 Toast로 `"저장했습니다: <파일명>  (다운로드 폴더에 들어갑니다. 같은 이름이 있으면 (1)이 붙을 수 있습니다)"`, `hasUnsaved=false`. 실패 시 빨간 Toast "저장하지 못했습니다. 다시 시도해 주세요."

- [ ] **Step 1: 실패하는 테스트** — `exportDoc.test.js` (테스트 안에서 `pdf-lib`로 3페이지 PDF 생성, 2번째는 `setRotation(degrees(90))`): ① `pages:[0,1,2]` → 결과 페이지 수 3 ② `pages:[1]` → 1 ③ 회전된 페이지에 공조 하나를 얹은 뒤 다시 로드해도 오류 없이 열림 ④ 이미지 소스(1×1 PNG)로 `exportPdf` → 페이지 수 1 ⑤ `editedName` 과 함께 한글 파일 이름이 그대로 쓰임(다운로드 호출은 `downloadBlob` 을 모킹해 filename 인자 검증).
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 위 시그니처대로. 도형 그리기는 공조=사각형(테두리 4pt, 색 외곽선, 채움 없음), 배관=`PIPE_WIDTH` 굵은 선(꺾기는 `pipePoints` 선분들을 둥근 이음), 글씨=PNG. 회전 페이지는 점 단위로 `viewToPdf` 해서 선분으로 그려 방향 문제를 피한다(공조도 4점 폴리라인).
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: 수동 확인** — 실제 도면 PDF에 공조·배관·글씨를 넣고 ① 전체 ② 수정한 페이지만 ③ 한 장 PDF ④ 한 장 PNG 로 저장해 열어 보고 위치가 화면과 같은지, 원본 텍스트가 여전히 선택되는지 확인. 이미지 도면도 확인.
- [ ] **Step 6: Commit** — `git commit -m "feat: PDF·이미지 저장과 저장 창"`

### Task 8: 저장하지 않은 작업 보호와 마무리

**Files:**
- Create: `src/components/ConfirmDialog.vue`
- Modify: `src/App.vue`, `README.md`, `package.json`(deploy 스크립트 확인)
- Test: `tests/App.test.js`

**Interfaces:**
- Consumes: `doc.hasUnsaved`, `doc.openFile`.
- Produces: `ConfirmDialog.vue` props `message`, `okLabel`, `cancelLabel`; 이벤트 `ok`, `cancel`.

- [ ] **Step 1: 실패하는 테스트** — `App.test.js`: 도형이 있는 상태에서 새 파일을 열려 하면 확인 창 문구 `저장하지 않은 작업이 있습니다. 그래도 새로 열까요?` 가 보이고 "아니요"면 기존 도면 유지, "네"면 교체; 도형이 없으면 확인 없이 열림; 열기 실패(`OPEN_FAILED`) 시 Toast `이 파일은 열 수 없습니다. PDF나 이미지 파일인지 확인해 주세요.` 가 나오고 기존 도면 유지.
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — 열기 경로(버튼, 끌어다 놓기)를 한 함수로 모아 확인 창을 거치게 한다. `hasUnsaved` 일 때만 `beforeunload` 로 브라우저 기본 경고를 건다.
- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 PASS.
- [ ] **Step 5: README 갱신** — 새 기능, 실행·배포 방법, 알려진 한계(저장된 PDF의 새 글씨는 이미지, 목록은 브라우저에만 저장)를 한국어로.
- [ ] **Step 6: 최종 확인** — `npm run build` 성공 후 `npm run preview` 로 열어 스펙 4.1~4.8 을 하나씩 훑는다(특히 1280×720, 10장 넘는 PDF, 회전 PDF, 한글 파일 이름). 이상 없으면 사용자에게 `npm run deploy` 여부를 묻는다(배포는 사용자 승인 후).
- [ ] **Step 7: Commit** — `git commit -m "feat: 저장 안 한 작업 보호와 문서 정리"`

---

## Self-Review 결과

- 스펙 4.1~4.9, 5, 5.1 항목은 각각 Task 1(4.9), 2(4.4·4.8 로직), 3(4.3·5.1 배관·좌표), 4(4.2·4.6·5.1 열기 실패), 5(4.3·4.5·4.7·마우스 구분), 6(4.1·4.4·4.5·화면 크기), 7(4.8·5.1 원본 유지·저장 이름), 8(5.1 작업 보호)에 대응한다.
- 타입·이름 일관성: `Source`, `objectsByPage`, `viewToPdf`, `saveOptions`, `editedName` 는 정의한 Task와 사용하는 Task에서 같은 이름이다.
- 의도적으로 뺀 것: 한글 폰트 임베드(스펙 6장 허용 범위), Undo, 임시 저장.
