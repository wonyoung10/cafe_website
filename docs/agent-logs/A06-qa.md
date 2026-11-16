# A06 — QA / Performance Engineer

## Delivered

Implemented against the integrated sources on `test/qa-optimization`. No commit, dependency change, restyling, or unrelated refactor performed.

| Files | Automated coverage / requirement IDs |
|---|---|
| `tests/e2e/fixtures.ts`, updated `smoke.spec.ts` | QA-06: automatic console-error and pageerror collection while the top-level page is same-origin; failures attach the collected errors. Only errors attributable to OpenStreetMap and network failures attributable to the configured Google/Pretendard font CDNs are exempt. Unknown-source errors still fail. Existing smoke tests also use this fixture. |
| `routing.spec.ts` | RT-02..08, RT-12..13: direct routes and h1/title, active `aria-current`, header SPA navigation with a persistent window marker, logo, history, query-preserving reload, 404 recovery, mobile open/navigation/close/Escape. |
| `menu.spec.ts` | MN-02..05, MN-09: 23/8/6/4/5 card counts, pressed state, query/history and unrelated-param preservation, dessert badge exclusion, actual image decoding for the first four cards. |
| `home.spec.ts` | HM-02, HM-04..06: exact hero copy, four featured cards, working CTA destinations, no preview canvas before viewport approach and a mounted canvas after scrolling, address/location link. |
| `location.spec.ts` | LC-01..05: exact address, copy feedback and desktop Chromium clipboard readback with permissions, correct external hosts/target/rel, titled OpenStreetMap iframe. No assertions or navigation inside its remote frame. |
| `store.spec.ts` | ST-01, ST-03, ST-05..12, ST-15..16: canvas/readiness/loading removal, desktop orbit drag, walk/W movement with 1.6 m eye height, actual north-wall approach and continued movement within bounds, all six hotspot list panels/Escape/focus restoration, reset position/target, mobile D-pad, forced no-WebGL fallback. |
| `responsive.spec.ts` | DS-04, partial MN-07: no document overflow on all four routes and 404 in both configured projects, header breakpoint visibility, additional measurement after scrolling lower sections. The home preview is mounted before the lower measurement. Grid column counts are covered only by existing source/component structure, not an explicit E2E assertion. |
| `src/components/layout/ScrollToTop.test.tsx` | RT-09: added encoded hash target, missing target, malformed hash, and query-only scroll preservation cases. |
| `src/hooks/useCopyToClipboard.test.ts` | LC-03: added missing-API fallback with selection restoration, throwing fallback cleanup, stale async feedback protection, and completion after unmount without a feedback timer. Existing AddressCard tests retain normal success/failure/focus coverage. |
| `playwright.config.ts` | Two workers limit contention between concurrent SwiftShader scenes. Both original viewport/device projects and launch flags are preserved. |

Playwright discovers **72 project/test combinations in 7 spec files** (36 per project, including the existing smoke tests). Desktop-only drag and mobile-only hamburger/D-pad cases use conditional `test.skip`. Discovery is verified; browser execution is not.

The 3D tests wait for readiness and completed camera transitions before comparing movement. The boundary test turns north through a real pointer drag, moves west through the clear aisle, requires reaching the north wall (`z < -4.1`), then keeps W pressed and samples room/height bounds for another three seconds. This avoids a false pass from merely stopping at furniture. Inputs are released in `finally` blocks. Hotspot tests bring the canvas back into view before checking/resetting the camera because offscreen rendering pauses on mobile.

## Reproduced defect and minimal fix

**RT-09 / QA-06 — malformed URL fragments crashed the route.** Rendering `/menu#%E0%A4%A` threw `URIError: URI malformed` in `ScrollToTop` because `decodeURIComponent` ran without error handling. The new regression test failed before the change:

```text
FAIL ScrollToTop > 잘못 인코딩된 해시는 앱을 중단하지 않는다
expected [Function] to not throw an error but 'URIError: URI malformed' was thrown
Test Files  1 failed | 1 passed (2)
     Tests  1 failed | 8 passed (9)
```

`src/components/layout/ScrollToTop.tsx` now catches fragment decoding failure and uses the literal fragment for lookup. If no matching element exists, the existing scroll-to-top behavior applies. This is the only application-source change; the regression and full suite now pass.

## Validation — verified

Three full validation rounds were used, within the retry limit:

1. Typecheck rejected `Promise.withResolvers` in the new tests because the project targets ES2023. Replaced it with a typed deferred Promise helper; no compiler configuration change.
2. Typecheck passed; lint identified the Playwright fixture callback parameter named `use` as React's `use` inside try/finally. Renamed the parameter to `run`; no lint suppression.
3. Final required command passed, exit 0:

```text
npm run typecheck && npm run lint && npm run test && npm run build

> tsc -b --noEmit
> eslint .
Test Files  19 passed (19)
     Tests  63 passed (63)
✓ 3138 modules transformed.
dist/assets/StorePreview-CdTjxzX0.js             1.60 kB │ gzip:   0.97 kB
dist/assets/StorePage-D5CYje4c.js               44.33 kB │ gzip:  15.39 kB
dist/assets/index-BKLKm9E6.js                  445.19 kB │ gzip: 145.53 kB
dist/assets/useSceneEnvironment-Dn1xY6Bv.js  1,047.04 kB │ gzip: 289.42 kB
✓ built in 263ms
```

- QA-01: passed, including the E2E sources. Standalone `npx tsc -p tsconfig.node.json --noEmit` also passed after all test changes. No explicit `any` added.
- QA-02: passed, **0 ESLint errors and 0 warnings**.
- QA-03: passed, **63 unit/component tests** across 19 files; eight new cases.
- QA-05: build passed. Initial JS **145.53 kB gzip**, below the 200 kB target. Lazy 3D JS is the shared scene chunk **289.42 kB**, StorePage **15.39 kB**, and StorePreview **0.97 kB** gzip (Vite's reported decimal kB; combined 305.78 kB).
- `rg 'WebGLRenderer' dist/assets/index-*.js`: **no output**, expected exit 1. Independent byte checks find `WebGLRenderer` only in the shared lazy scene chunk and not in the entry. Three.js remains outside the entry chunk.
- `npx playwright test --list`: exit 0, `Total: 72 tests in 7 files`.
- `git diff --check`: exit 0.

Build/test advisories: Vite reports its existing >500 kB warning for the lazy shared 3D chunk. Vitest prints dependency `THREE_CJS_DEPRECATED` notices and jsdom getContext notices from the existing route test. These do not fail validation and are distinct from browser console verification. No dependency/configuration refactor was made to hide them.

## E2E execution — unverified / delegated

The required single execution attempt was:

```text
npx playwright test --project=desktop-chromium tests/e2e/routing.spec.ts

[WebServer] error when starting preview server:
[WebServer] Error: listen EPERM: operation not permitted ::1:4173
Error: Process from config.webServer was not able to start. Exit code: 1
```

The sandbox denied preview-server port binding before any browser test ran. No repeated launch, alternate port, or permission escalation was attempted. **QA-04 and runtime QA-06 remain unverified**; the console fixture is implemented and typechecked, but zero runtime errors cannot be claimed. All visual, clipboard, navigation, lazy-loading, image-decoding, 3D movement/bounds/reset, responsive, and fallback E2E assertions await orchestrator execution.

Also unverified: actual 60 fps desktop / 30 fps mobile targets, low-end GPU performance/draw calls, appearance and contrast/focus audit, physical touch/gesture feel, wheel/pinch zoom and orbit pan, fullscreen, context-loss recovery in a real GPU, reduced-motion visual behavior, 375/768/1440 screenshot comparison, Safari, and Firefox. The configured mobile project is Pixel 7 emulation, not a physical-device test.

## Requests to orchestrator

1. Run `npm run test:e2e` outside the port-binding sandbox to execute both configured projects and review retained failure traces/HTML report. Keep the console fixture enabled and report QA-04/06 only after that run.
2. Complete the manual visual/device/GPU checks above, especially ST-02/04/06/13, DS-05, and the 375/768/1440 screenshots. No out-of-scope source change is requested.

## 오케스트레이터(A01) E2E 실행 결과 — 2026-11-16

Codex 샌드박스에서 포트 바인딩이 차단(`EPERM :4173`)되어 E2E는 A01 하네스(Claude Code)에서 실행했다.

| 회차 | 결과 | 비고 |
|---|---|---|
| 1 | 67 passed / 2 failed / 3 skipped | `routing.spec.ts` "헤더 링크는 SPA 이동…" 데스크톱·모바일 실패: `/store` → 다른 페이지 이동 시 `NotFoundError: removeChild` pageerror |
| 2 | **69 passed / 0 failed / 3 skipped** | 아래 결함 수정 후 |

### 결함 #2 — 3D 매장 이탈 시 removeChild 오류 (A01 수정)
- 원인: drei `Html` 핫스팟 마커가 마커마다 별도 React root를 만들어, 라우트 이동으로 Canvas가 언마운트될 때 DOM 정리 순서가 충돌. 개발 모드 콘솔의 "Attempted to synchronously unmount a root while React was already rendering" 경고도 같은 원인.
- 수정: `HotspotProjector`(Canvas 내부, 매 프레임 3D→화면 좌표 투영)와 React가 관리하는 오버레이 버튼(`HotspotMarkers`)으로 교체. 추가 React root 없음.
- 검증: E2E 전체 통과, 프로덕션 미리보기에서 콘솔 오류 0건, 마커 위치 스크린샷 확인.

### 건너뛴 3개
기기 조건부 테스트(데스크톱 전용 드래그 → 모바일 프로젝트, 모바일 전용 방향 패드·햄버거 → 데스크톱 프로젝트)로 의도된 skip.

### 성능 측정 (프로덕션 미리보기, Playwright chromium + SwiftShader)
- `/store` 진입 → `__CAFE_3D__.ready`까지 약 2.7초 (소프트웨어 렌더러 기준)
- 초기 JS gzip 약 145.5KB (목표 200KB 이내), Three.js는 별도 lazy 청크

### 미검증 항목
- 실제 모바일 기기 터치 감도·GPU 프레임레이트, Safari/Firefox 동작 (chromium만 자동화)
