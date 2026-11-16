# 하루의 잎 — 카페 브랜드 소개 웹사이트

> 당신의 하루에, 잎사귀 하나.

대학교 웹 프로그래밍 과제로 제작한 카페 소개 SPA입니다. (브랜드명 '하루의 잎'은 임시 이름)

## 기술 스택
React 19 · Vite · TypeScript · React Router DOM 7 · Tailwind CSS 4 · Three.js · React Three Fiber · Drei · Motion · Lucide React · Vitest · Playwright

## 실행
```bash
npm install
npm run dev          # http://localhost:5173
```

## 스크립트
| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 (SPA fallback 지원) |
| `npm run typecheck` | TypeScript 검사 |
| `npm run lint` | ESLint |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E (최초 1회 `npx playwright install chromium`) |
| `npm run verify` | typecheck + lint + test + build |

## 문서
기획 문서는 [`docs/`](docs/)에 있습니다.
