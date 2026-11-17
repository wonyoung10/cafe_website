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

## Vercel 배포
설정은 [`vercel.json`](vercel.json)에 들어 있어 Vercel 화면에서 따로 바꿀 값이 없습니다.

| 항목 | 값 |
|---|---|
| Framework | Vite |
| Install / Build | `npm ci` / `npm run build` |
| Output | `dist` |
| Node | 22.12 이상 (`package.json`의 `engines`) |
| 새로고침·직접 주소 입력 | `/assets/`, `/images/`를 뺀 모든 경로를 `index.html`로 보냄 |
| 캐시 | `/assets/*` 1년(파일명에 해시 포함), `/images/*` 7일 |

배포 방법은 둘 중 하나입니다.

1. **GitHub 연결:** 저장소를 GitHub에 올린 뒤 Vercel에서 *Add New → Project*로 가져옵니다. 이후 `main`에 푸시할 때마다 자동 배포됩니다.
2. **CLI:** 프로젝트 폴더에서 실행합니다.
   ```bash
   npx vercel        # 처음엔 로그인과 프로젝트 연결을 묻습니다. 미리보기 배포
   npx vercel --prod # 실제 주소로 배포
   ```

공유 미리보기 이미지(`og:image`)는 빌드할 때 Vercel이 주는 운영 도메인(`VERCEL_PROJECT_PRODUCTION_URL`)으로 절대 주소가 됩니다. 직접 산 도메인을 쓰면 Vercel 환경 변수에 `SITE_URL=https://도메인`을 넣어 주세요.

## 문서
기획 문서는 [`docs/`](docs/)에 있습니다.
