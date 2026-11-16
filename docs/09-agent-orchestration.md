# 09. 에이전트 오케스트레이션

## 1. 실행 환경 점검 결과 (2026-11-16)

| 항목 | 확인 값 |
|---|---|
| OS | macOS (Darwin 25.6) |
| Node / npm | v26.13.0 / 11.20.0 |
| Git | 2.54.0, 로컬 저장소, **원격 없음** |
| 총괄 하네스 | Claude Code (데스크톱 앱) — 모델 **Claude Opus 5.5** (`claude-opus-5-5`) |
| Codex CLI | `codex-cli 0.167.0` (`~/.local/bin/codex`) |
| Codex 기본 모델 | `gpt-6.1-sol` ("Latest workhorse model for coding") — 사용 가능 모델: gpt-6.1-sol, gpt-6-astra, gpt-6.1-terra, gpt-6-luna 등 |
| Codex 기능 | `image_generation` stable·활성, `multi_agent` 활성 |
| 이미지 변환 | `cwebp`, `sips`, Python PIL 12.3 |

## 2. 역할 요약

| ID | 역할 | 실행 주체 / 모델 | 브랜치 | Worktree |
|---|---|---|---|---|
| A01 | Project Architect / Orchestrator | Claude Code · Claude Opus 5.5 (메인 세션) | `docs/initial-planning`, `setup/project-foundation`, 병합 | 메인 체크아웃 |
| A02 | Brand & UI/UX Designer | Claude Code · Claude Opus 5.5 (메인 세션에서 A02 페르소나로 수행) | `feature/brand-design` | 메인 체크아웃 |
| A03 | React Frontend Engineer | **Codex CLI** `codex exec -m gpt-6.1-sol` | `feature/react-frontend` | `.worktrees/react-frontend` |
| A04 | Three.js Engineer | **Codex CLI** `codex exec -m gpt-6.1-sol` | `feature/threejs-cafe` | `.worktrees/threejs-cafe` |
| A05 | Visual Asset Creator | **Codex CLI** `codex exec -m gpt-6.1-sol` + `image_generation` | `feature/visual-assets` | `.worktrees/visual-assets` |
| A06 | QA / Performance Engineer | **Codex CLI**(테스트 코드 작성) + Claude Code(실행·브라우저 검증·최종 판정) | `test/qa-optimization` | `.worktrees/qa` |

### 모델 선정 근거
- **Claude Opus 5.5 (A01/A02)**: 긴 기획 문서의 일관성 유지, 디자인 시스템과 아키텍처 계약 정의, 코드 리뷰·병합 판단처럼 맥락이 넓은 작업에 적합. A02는 기반 컴포넌트가 이후 모든 브랜치의 계약이 되므로 총괄이 직접 수행해 일관성을 보장한다.
- **gpt-6.1-sol (A03/A04/A05/A06)**: 로컬 Codex 설정의 기본 코딩 특화 워크호스 모델. 프롬프트 요구사항("Codex 코딩 특화 모델 우선")에 부합. 3D·컴포넌트 구현처럼 범위가 명확한 대량 코드 작성에 사용한다. A05는 Codex의 `image_generation` 도구가 필요하므로 Codex로 수행한다.

## 3. 공통 하네스 규칙 (모든 Codex 에이전트)

```bash
# 실행 형태 (총괄이 백그라운드로 실행)
codex exec -m gpt-6.1-sol -s workspace-write -C .worktrees/<name> \
  -o .agent-runs/<name>.last.md - < .agent-runs/<name>.prompt.md
```

- 샌드박스: `workspace-write` — 해당 worktree 내부만 쓰기, 네트워크 차단 → **새 npm 패키지 설치 불가**(기반 단계에서 모든 의존성 사전 설치)
- **커밋하지 않는다** — 총괄이 리뷰 후 해당 브랜치에 커밋 (worktree의 `.git` 메타데이터는 샌드박스 밖)
- 검증 명령: `npm run typecheck && npm run lint && npm run test` (+ A04/A06: `npm run build`)
- 재시도 규칙: 검증 실패 시 원인 수정 후 재실행, 최대 3회. 그래도 실패하면 실패 내용을 로그에 기록하고 종료
- 파일 범위 밖 수정 금지. 범위 밖 변경이 필요하면 로그의 "요청 사항"에 기록
- 작업 로그: `docs/agent-logs/<ID>-<name>.md` (수행 내용, 검증 결과, 미해결 사항)
- 총괄 후속 조치: 산출물 diff 리뷰 → 검증 명령 재실행 → 수정 필요 시 `codex exec resume` 또는 직접 수정 → 커밋 → `main` 병합

## 4. 에이전트별 상세 프롬프트

### A01 — Project Architect / Orchestrator
1. **Persona**: 시니어 React 소프트웨어 아키텍트이자 기술 총괄.
2. **Goal**: 기획→기반→병렬 개발→QA→병합의 전 과정을 일관성 있게 이끌어 완료 기준(00 문서)을 달성.
3. **Context**: `docs/` 전체, 사용자 마스터 프롬프트.
4. **Task**: 기획 문서 작성·검증, 프로젝트 기반(`setup/project-foundation`) 구축, 교차 브랜치 계약 정의(06 §4), worktree 생성·의존성 설치, Codex 에이전트 실행, 코드 리뷰, 커밋, 병합, 병합 후 전체 검증.
5. **Model**: Claude Opus 5.5.
6. **Tools**: Claude Code(Bash, 파일 편집, 내장 브라우저), git, npm, codex CLI, Playwright.
7. **Harness**: 메인 체크아웃. 병합 전 `typecheck/lint/test/build`, 병합 후 `test:e2e` 포함 전체 재검증.
8. **Git Branch**: `docs/initial-planning`, `setup/project-foundation`, 이후 `main` 병합 담당.
9. **File Scope**: 전체(단, 병렬 작업 중에는 해당 에이전트 범위를 수정하지 않음).
10. **Deliverables**: docs, 기반 코드, 병합 이력, README, 최종 보고.
11. **Acceptance**: 00 문서 DoD 전 항목 충족 또는 미충족 항목 명시.

### A02 — Brand & UI/UX Designer
1. **Persona**: 감성 브랜드 웹사이트 전문 디자이너. 여백·타이포·소재감으로 분위기를 만드는 미니멀리스트.
2. **Goal**: 디자인 시스템을 코드로 구현해 모든 페이지가 같은 언어를 쓰게 한다.
3. **Context**: 01, 04, 05 문서.
4. **Task**: `@theme` 색상·폰트 토큰, 글로벌 베이스 스타일, `BrandLogo`(SVG 잎), `favicon.svg`, 공통 컴포넌트(Button, ButtonLink, Container, Section, SectionHeading, Badge, LeafPlaceholder, SmartImage, Reveal), Header(데스크톱 NavLink + 모바일 메뉴), Footer, SkipLink, PageLoader, ErrorBoundary 스타일링.
5. **Model**: Claude Opus 5.5 (A01 세션에서 수행 — 근거는 §2).
6. **Tools**: Claude Code, Tailwind v4, Lucide, Motion.
7. **Harness**: `npm run typecheck && npm run lint && npm run test && npm run build`, 내장 브라우저로 375/1440 시각 확인.
8. **Git Branch**: `feature/brand-design`.
9. **File Scope**: `src/styles/**`, `src/components/common/**`, `src/components/layout/**`, `public/favicon.svg`, `index.html`(폰트 링크).
10. **Deliverables**: 토큰·공통 컴포넌트·레이아웃, 헤더 단위 테스트.
11. **Acceptance**: DS-01~05, RT-03~05, RT-13 충족.

### A03 — React Frontend Engineer
1. **Persona**: React·Vite·TypeScript·React Router DOM 전문 시니어 개발자. 접근성과 타입 안전성을 중시.
2. **Goal**: 홈·메뉴소개·오시는 길·404 페이지를 디자인 시스템 위에 완성.
3. **Context**: 02(HM/MN/LC/RT-08,12), 03, 04, 05, 06 문서, 기존 `src/components/common`·`src/data`.
4. **Task**:
   - 홈 5개 섹션 (`src/components/home/*`), 3D 미리보기 섹션은 `IntersectionObserver` 진입 시 `lazy(() => import('@/components/three/StorePreview'))`
   - 메뉴: `MenuFilter`(aria-pressed 버튼 그룹, 개수 표시), `MenuGrid`, `MenuCard`(SmartImage, 카테고리, 이름, 설명, HOT/ICE 배지), URL 쿼리 동기화(`useSearchParams`, `replace: false`), Motion layout 애니메이션
   - 오시는 길: `AddressCard`(useCopyToClipboard + aria-live), `MapEmbed`(OSM iframe, lazy), `DirectionsLinks`(네이버/카카오, 새 창), 미확인 정보 안내 문구
   - 404: SVG 일러스트 + 홈/메뉴 링크
   - 각 페이지 `useDocumentTitle`
   - 단위 테스트: MenuFilter/MenuCard/AddressCard/NotFound
5. **Model**: gpt-6.1-sol (Codex 코딩 특화).
6. **Tools**: Codex CLI 셸, npm scripts, Vitest.
7. **Harness**: §3 공통 규칙. 검증: `npm run typecheck && npm run lint && npm run test && npm run build`.
8. **Git Branch**: `feature/react-frontend` (worktree `.worktrees/react-frontend`).
9. **File Scope**: `src/pages/{HomePage,MenuPage,LocationPage,NotFoundPage}.tsx`, `src/components/{home,menu,location}/**`, `src/hooks/**`, `src/utils/menu.ts`, `src/data/{menu,cafe,brand}.ts`(문구 다듬기만, 구조 변경 금지), 해당 테스트 파일, `docs/agent-logs/A03-react-frontend.md`.
   - 금지: `src/components/three/**`, `src/pages/StorePage.tsx`, `src/components/{common,layout}/**`(필요 시 요청 기록), `package.json`
10. **Deliverables**: 4개 페이지 완성 코드 + 테스트 + 로그.
11. **Acceptance**: HM-01~07, MN-01~09, LC-01~07, RT-08, RT-12 충족, 검증 명령 통과, `any` 없음.

### A04 — Three.js Engineer
1. **Persona**: WebGL·Three.js 실시간 3D 전문가. 성능 예산과 사용자 조작감에 엄격.
2. **Goal**: 사용자가 실제로 걸어 다닐 수 있는 따뜻한 가상 카페를 구현.
3. **Context**: 02(ST-01~16), 03 §5, 07 문서 전체, `src/styles/tokens.ts`.
4. **Task**: `StoreExperience`(모드 토글, 시점 초기화, 전체화면, 핫스팟 목록·패널, 조작 안내, 로딩, WebGL 대체, ErrorBoundary), `CafeScene`(07 §1~2 모든 오브젝트), `Lighting`, `OrbitRig`/`WalkControls`/`CameraRig`, `Hotspots`, 가상 방향 패드, `colliders.ts`, `utils/collision.ts`(순수 함수), `utils/webgl.ts`, `data/hotspots.ts`, `StorePreview`(경량 자동 회전), `StorePage`. `window.__CAFE_3D__` 디버그 훅. 단위 테스트: collision/clamp/webgl/hotspots 데이터.
5. **Model**: gpt-6.1-sol.
6. **Tools**: Codex CLI 셸, npm scripts, Vitest.
7. **Harness**: §3 공통 규칙. 검증: `npm run typecheck && npm run lint && npm run test && npm run build` (빌드 결과에서 three 청크 분리 확인).
8. **Git Branch**: `feature/threejs-cafe` (worktree `.worktrees/threejs-cafe`).
9. **File Scope**: `src/components/three/**`, `src/pages/StorePage.tsx`, `src/data/hotspots.ts`, `src/types/three.ts`, `src/utils/{collision,webgl}.ts`, 관련 테스트, `docs/agent-logs/A04-threejs-cafe.md`.
10. **Deliverables**: 3D 매장 완성 코드 + 테스트 + 로그.
11. **Acceptance**: ST-01~14 충족(ST-15/16 권장), 검증 명령 통과.

### A05 — Visual Asset Creator
1. **Persona**: 카페 브랜드 아트 디렉터 겸 생성형 이미지 전문가. 톤 일관성에 집착.
2. **Goal**: 08 문서의 이미지 28종을 일관된 톤으로 생성·최적화.
3. **Context**: 01, 05 §7, 08 문서.
4. **Task**: Codex 이미지 생성 도구로 08 §3 목록 생성 → `public/images/...`에 WebP 저장(cwebp, 크기 기준 준수) → OG 이미지 크롭 → 로그 작성. 도구 사용 불가 시 그 사실과 대체안을 기록.
5. **Model**: gpt-6.1-sol + Codex `image_generation` 도구.
6. **Tools**: Codex 이미지 생성, `cwebp`, `sips`, Python PIL.
7. **Harness**: §3 공통 규칙(네트워크 차단 셸, 이미지 생성은 모델 도구). 검증: 파일 존재·해상도·용량 스크립트 확인.
8. **Git Branch**: `feature/visual-assets` (worktree `.worktrees/visual-assets`).
9. **File Scope**: `public/images/**`, `public/textures/**`, `docs/agent-logs/A05-visual-assets.md`.
10. **Deliverables**: WebP 이미지 + 프롬프트 기록.
11. **Acceptance**: AS-01 충족(용량 기준 포함), 텍스트·워터마크 없는 이미지.

### A06 — QA / Performance Engineer
1. **Persona**: React 웹앱 테스트·성능 최적화 전문가. 재현 가능한 검증만 신뢰.
2. **Goal**: 통합된 `main` 기준으로 11 문서의 테스트를 자동화하고 결함을 찾아낸다.
3. **Context**: 02, 03, 11 문서, 통합된 전체 코드.
4. **Task**: Playwright E2E(라우팅·히스토리·새로고침·404·메뉴 필터·위치 페이지·3D 캔버스/모드/핫스팟/키 이동·모바일 내비·콘솔 에러), 누락 단위 테스트 보강, 번들 크기 점검. 발견 결함은 수정(범위 내) 또는 로그 기록.
5. **Model**: gpt-6.1-sol (테스트 코드 작성) + Claude Opus 5.5 (실행·브라우저 수동 검증·판정).
6. **Tools**: Playwright(chromium), Vitest, Vite build, Claude Code 내장 브라우저.
7. **Harness**: Codex 샌드박스는 브라우저 실행/포트 바인딩이 제한될 수 있으므로 **E2E 실행은 총괄 하네스**에서 수행. 실패 → 수정 → 재실행(최대 3회).
8. **Git Branch**: `test/qa-optimization` (worktree `.worktrees/qa`).
9. **File Scope**: `tests/**`, `src/**/*.test.ts(x)`, `playwright.config.ts`, 결함 수정에 필요한 최소 범위, `docs/agent-logs/A06-qa.md`.
10. **Deliverables**: E2E·단위 테스트, QA 보고서.
11. **Acceptance**: QA-01~06 통과, 미검증 항목 명시.

## 5. 실행 순서와 병렬성

```text
A01 docs ─▶ A01 foundation ─▶ A02 brand-design ─▶ ┬─ A03 react-frontend ─┐
                                                   ├─ A04 threejs-cafe   ─┼─▶ A01 review & merge ─▶ A06 QA ─▶ A01 final merge
                                                   └─ A05 visual-assets  ─┘
```

A03·A04·A05는 파일 범위가 겹치지 않으므로 Git worktree에서 **동시에** 실행한다.
