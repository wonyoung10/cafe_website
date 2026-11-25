# 11. 테스트 전략

## 1. 테스트 피라미드

| 레벨 | 도구 | 위치 | 대상 |
|---|---|---|---|
| 정적 검사 | `tsc --noEmit`, ESLint | 전체 | 타입, Hooks 규칙, 미사용 코드 |
| 단위/컴포넌트 | Vitest + Testing Library + jsdom | `src/**/*.test.ts(x)` | 유틸·데이터·컴포넌트 |
| E2E | Playwright (chromium) | `tests/e2e/*.spec.ts` | 실제 브라우저 사용자 흐름 |
| E2E (회원·구매·리뷰) | Playwright (chromium), 메모리 백엔드 빌드 | `tests/e2e/commerce/*.spec.ts` | 가입 → 담기 → 결제(모의) → 리뷰 전체 흐름 (§10) |
| 빌드 | `vite build` | — | 번들 생성, 청크 분리 |
| 수동 | Claude Code 내장 브라우저 | — | 시각 품질, 3D 조작감 |

npm 스크립트: `typecheck`, `lint`, `test`, `test:watch`, `test:e2e`, `build`, `preview`, `verify`(= typecheck+lint+test+build).

## 2. 라우팅 테스트

| 케이스 | 레벨 | 기대 |
|---|---|---|
| `/`, `/menu`, `/store`, `/location` 렌더 | 단위(MemoryRouter) + E2E | 각 페이지 h1 |
| 헤더 링크 클릭 이동 | E2E | URL 변경, 전체 리로드 없음(`window` 마커 유지) |
| 활성 메뉴 | 단위 | 현재 경로 NavLink `aria-current="page"` |
| 로고 → 홈 | E2E | `/` |
| 뒤로/앞으로 | E2E | 이전/다음 페이지 h1 |
| 새로고침 유지 | E2E | `/menu?category=tea` reload 후 동일 |
| 404 | 단위 + E2E | `/nope` → 404 heading, 홈 링크 |
| 스크롤 최상단 | 단위 | 경로 변경 시 `scrollTo(0,0)` 호출 |
| 모바일 메뉴 | E2E(모바일) | 열기→링크 클릭→닫힘 |

## 3. UI 컴포넌트 테스트

- `Header`: 3개 항목 순서·텍스트
- `MenuCard`: 이름·설명·카테고리·HOT/ICE 배지, 디저트는 배지 없음
- `SmartImage`: `error` 이벤트 시 플레이스홀더
- `AddressCard`: 복사 클릭 → `navigator.clipboard.writeText` 호출, "복사되었어요" 표시
- `DirectionsLinks`: href·`target="_blank"`·`rel`
- `NotFoundPage`: 링크

## 4. 메뉴 필터링 테스트

- `filterMenuItems`: all=23, coffee=8, non-coffee=6, tea=4, dessert=5
- `parseMenuFilter`: 유효값/null/잘못된 값→'all'
- 데이터 무결성: id 고유, image 경로 `/images/menu/{id}.webp`, featured 정확히 4개, 모든 메뉴에 3,000~8,000원·100원 단위 가격
- E2E: 필터 클릭 후 카드 수, `aria-pressed`, URL 쿼리

## 5. Three.js 인터랙션 테스트

| 케이스 | 레벨 | 방법 |
|---|---|---|
| 충돌 해결(벽·가구, 미끄러짐) | 단위 | `resolveMovement` 순수 함수 |
| 방 경계 클램프 | 단위 | `clampToRoom` |
| WebGL 감지 | 단위 | `getContext` mock → fallback 렌더 |
| 핫스팟 데이터 | 단위 | 6개, id 고유, 위치가 방 내부 |
| 캔버스 렌더 | E2E | `/store`에 `canvas` 존재, 로딩 오버레이 사라짐 |
| 드래그 회전 | E2E | 드래그 전후 `window.__CAFE_3D__.getCamera()` 값 변화 |
| 실내 탐색 이동 | E2E | 모드 전환 후 `W` 키 누름 → 위치 변화, 높이 1.6 유지 |
| 핫스팟 선택 | E2E | 목록 버튼 클릭 → 설명 패널 표시 |
| WebGL 대체 UI | E2E | `HTMLCanvasElement.prototype.getContext`를 init script로 null 처리 → 대체 UI |
| 터치 | 수동 + E2E(모바일 프로젝트에서 방향 패드 표시) | |

Playwright chromium은 헤드리스에서도 SwiftShader(소프트웨어 WebGL)로 렌더 가능.

## 6. 반응형 테스트

- Playwright 프로젝트: `desktop-chromium`(1440×900), `mobile-chromium`(Pixel 7)
- 검사: 가로 스크롤 없음(`document.documentElement.scrollWidth <= innerWidth`), 햄버거 노출(모바일)/숨김(데스크톱), 메뉴 그리드 열 수
- 수동: 375 / 768 / 1440 스크린샷 비교

## 7. 빌드 검사

- `npm run build` 성공, 경고 검토
- `dist/assets`에서 three 관련 코드가 `StorePage`/`StorePreview` 청크로 분리되었는지 확인 (`index-*.js`에 `WebGLRenderer` 문자열 없음)
- 초기 JS gzip ≤ 200KB 목표
- `npm run preview` 후 E2E 실행 (프로덕션 번들 기준) — Playwright `webServer`는 `npm run build && npm run preview -- --port 4173`

## 8. 콘솔 오류

E2E 공통 fixture에서 `page.on('console', type==='error')`와 `pageerror`를 수집해 테스트 종료 시 0건 확인 (외부 지도 iframe 내부 오류는 프레임 출처로 제외).

## 9. 미검증 항목 기록

자동화로 검증하지 못한 항목(실기기 터치 감도, 저사양 GPU 프레임레이트, Safari/Firefox)은 `docs/agent-logs/A06-qa.md`에 **미검증**으로 명시한다.

## 10. 회원·구매·리뷰 E2E (A16)

실제 Supabase 없이 브라우저에서 전체 흐름을 보려고 메모리 백엔드(`VITE_COMMERCE_BACKEND=memory`, localStorage 보관)로 따로 빌드해 시험한다. 기존 스펙은 기본 빌드를 그대로 쓰므로 서로 덮어쓰지 않는다.

| 프로젝트 | 빌드·포트 | 스펙 |
|---|---|---|
| `desktop-chromium`, `mobile-chromium` | 기본 빌드 `dist`, 4173 | `tests/e2e/*.spec.ts` (commerce 폴더 제외) |
| `commerce-desktop` | 메모리 빌드 `node_modules/.cache/haru-commerce-memory`, 4183 | `tests/e2e/commerce/*.spec.ts` 전부 |
| `commerce-mobile` (Pixel 7) | 같은 메모리 빌드 | 위에서 `layout`·`keyboard` 제외 (이 둘은 뷰포트를 스스로 정하거나 키보드 전용이라 데스크톱만) |
| `commerce-default-build` | 기본 빌드, 4173 | `unconfigured.spec.ts` (키 없는 운영 빌드는 준비 안내만, 번들에 메모리 백엔드 없음) |

- 포트는 `E2E_PORT`, `E2E_COMMERCE_PORT` 환경 변수로 바꿀 수 있다. 다른 작업 트리가 같은 포트를 쓰고 있으면 `reuseExistingServer` 때문에 엉뚱한 빌드를 시험하게 되니 바꿔서 돌린다.
- `tests/e2e/commerce/helpers.ts`의 `test`는 기본 fixture(같은 출처 콘솔 오류 0건)에 더해 모든 테스트에서 자동으로 확인한다: 결제사 호스트로 간 요청 없음, 허용 목록(글꼴·지도) 밖 외부 요청 없음, GET 아닌 요청 없음.
- 테스트마다 새 브라우저 컨텍스트라 저장소가 비어 있고, 아이디는 `uid()`로 테스트마다 다르게 만든다. 한 테스트 안에서 로그아웃 후 다른 아이디로 가입하면 같은 브라우저를 쓰는 두 사용자가 된다(타인 리뷰 가림·수정 불가·남의 주문 접근 확인).
- 알려진 앱 버그를 문서화한 테스트는 `test.fail(true, 'BUG-nn …')`로 둔다. 버그가 고쳐지면 "예상과 달리 통과"로 실패하므로 그때 `test.fail`을 지운다.

| 요구사항 | 스펙 |
|---|---|
| AU-01~07 | `auth.spec.ts` (+ `keyboard.spec.ts`의 가입) |
| SH-01~03 | `cart.spec.ts` |
| SH-04~13 | `checkout.spec.ts` (응답 유실·끊긴 결제 복구는 단위 테스트 `CheckoutPage.test.tsx`) |
| RV-01~09 | `reviews.spec.ts` |
| 직접 주소·리디렉션·문서 제목 | `access.spec.ts` |
| 375px·768px 가로 넘침, 머리글 | `layout.spec.ts` |
| 키보드만으로 구매 | `keyboard.spec.ts` |
| 키 없는 빌드 | `unconfigured.spec.ts` |

