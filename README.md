# PDF Editor

브라우저에서 실행되는 PDF 편집 웹 앱입니다. 파일이 서버로 전송되지 않습니다.

## 기능

- **PDF 합치기** — 여러 PDF를 순서대로 합쳐서 1개로 다운로드
- **PDF 분리** — 페이지 범위를 지정해 여러 파일로 분리
- **편집 추가**
  - 텍스트 삽입 (폰트 크기, 색상, 위치 지정)
  - 이미지 삽입 (PNG, JPG / 위치·크기 지정)
  - 도형 삽입 (사각형, 선, 텍스트 도형 / 색상·크기 지정)

## 실행 방법

```bash
npm install
npm run dev
```

## 기술 스택

- React + Vite
- Tailwind CSS
- [pdf-lib](https://pdf-lib.js.org/) — PDF 조작
- [react-dropzone](https://react-dropzone.js.org/) — 파일 드롭 UI

## 좌표 안내

pdf-lib의 좌표계는 **좌하단이 (0, 0)** 이며 Y는 위로 갈수록 증가합니다.

| 용지 | 가로 | 세로 |
|------|------|------|
| A4   | 595pt | 842pt |
| Letter | 612pt | 792pt |
