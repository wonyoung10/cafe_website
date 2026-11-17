# 06. 기술 아키텍처

## 1. 스택과 버전 원칙

| 패키지 | 역할 | 비고 |
|---|---|---|
| `react`, `react-dom` 19.x | UI | |
| `vite` + `@vitejs/plugin-react` | 번들러/개발 서버 | |
| `typescript` (strict) | 언어 | `noUncheckedIndexedAccess` 포함 |
| `react-router-dom` 7.x | 라우팅 | `BrowserRouter` 선언형 모드 (→ ADR-002) |
| `tailwindcss` 4.x + `@tailwindcss/vite` | 스타일 | `@theme` 토큰 |
| `three`, `@react-three/fiber` 9.x, `@react-three/drei` 10.x | 3D | `/store` lazy 청크 |
| `motion` | 애니메이션 | `motion/react` import |
| `lucide-react` | 아이콘 | |
| `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | 단위 테스트 | |
| `@playwright/test` | E2E | chromium 데스크톱 + 모바일(Pixel 7) 프로젝트 |
| `eslint` 9 (flat) + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | 린트 | |

Next.js 및 파일 기반 라우팅 프레임워크는 사용하지 않는다. 경로 별칭 `@/` → `src/`.

## 2. 디렉터리 구조

```text
.
├── docs/                         기획 문서
├── public/
│   ├── images/{hero,brand,menu,store}/   WebP 에셋 (A05)
│   ├── textures/                 3D 텍스처 (선택, A05)
│   ├── favicon.svg
│   ├── _redirects                Netlify SPA fallback
│   └── (vercel.json은 루트)
├── src/
│   ├── main.tsx                  createRoot + <BrowserRouter> + <App/>
│   ├── app/
│   │   ├── App.tsx               MotionConfig + AppRoutes
│   │   ├── router.tsx            AppRoutes (<Routes>/<Route>, lazy StorePage)
│   │   └── routes.ts             ROUTES 상수, NAV_ITEMS
│   ├── components/
│   │   ├── layout/               RootLayout, Header, MobileNav, Footer, ScrollToTop, SkipLink, PageLoader
│   │   ├── common/               Button, ButtonLink, Container, Section, SectionHeading, Badge, BrandLogo, LeafPlaceholder, SmartImage, Reveal
│   │   ├── home/                 HeroSection, PhilosophySection, FeaturedMenuSection, StorePreviewSection, LocationSummarySection (A03)
│   │   ├── menu/                 MenuFilter, MenuGrid, MenuCard, TemperatureBadges (A03)
│   │   ├── location/             AddressCard, MapEmbed, DirectionsLinks (A03)
│   │   └── three/                StoreExperience, StorePreview, scene/*, controls/*, ui/* (A04)
│   ├── pages/                    HomePage, MenuPage, StorePage, LocationPage, NotFoundPage
│   ├── data/
│   │   ├── brand.ts              브랜드명·카피·철학 (교체 지점)
│   │   ├── cafe.ts               주소·좌표·지도 링크
│   │   ├── menu.ts               MENU_ITEMS, MENU_CATEGORIES
│   │   └── hotspots.ts           3D 핫스팟 (A04)
│   ├── hooks/                    useDocumentTitle, useCopyToClipboard, useMediaQuery, usePrefersReducedMotion, useInView
│   ├── styles/                   index.css(@theme), tokens.ts
│   ├── types/                    menu.ts, cafe.ts, three.ts
│   ├── utils/                    menu.ts(filter/parse), cn.ts, webgl.ts, collision.ts(A04)
│   └── test/setup.ts             jest-dom, matchMedia/IntersectionObserver/ResizeObserver mock
├── tests/e2e/                    Playwright 스펙
├── index.html, vite.config.ts, vitest 설정(vite.config 내 test), playwright.config.ts
├── eslint.config.js, tsconfig*.json, vercel.json
└── README.md
```

## 3. 라우트 설계

```ts
// src/app/routes.ts
export const ROUTES = { home: '/', menu: '/menu', store: '/store', location: '/location' } as const;
export const NAV_ITEMS = [
  { to: ROUTES.menu, label: '메뉴소개' },
  { to: ROUTES.store, label: '매장' },
  { to: ROUTES.location, label: '오시는 길' },
] as const;
```

- `RootLayout`: `SkipLink` → `Header` → `<main id="main"><Outlet/></main>` → `Footer` + `ScrollToTop`
- `ScrollToTop`: `useLocation()`의 `pathname` 변경 시 `window.scrollTo(0,0)`, `hash`가 있으면 해당 id로 `scrollIntoView`. 쿼리만 바뀐 경우(메뉴 필터)는 스크롤 유지.
- `StorePage`는 `lazy(() => import('@/pages/StorePage'))` + `Suspense fallback={<PageLoader/>}` → three/R3F/drei가 별도 청크로 분리.
- SPA fallback: `vite preview`/dev는 기본 지원, 배포용 `vercel.json` rewrites(`/assets/`·`/images/` 제외), `public/_redirects`(`/* /index.html 200`). Vercel 배포 설정과 절차는 README의 "Vercel 배포" 참고.

## 4. 컴포넌트 구조

```text
App
└── AppRoutes
    └── RootLayout
        ├── Header ─ BrandLogo(Link "/"), NavLink×3, MobileNav
        ├── <Outlet/>
        │   ├── HomePage ─ Hero · Philosophy · FeaturedMenu(MenuCard×4) · StorePreviewSection(lazy StorePreview) · LocationSummary
        │   ├── MenuPage ─ MenuFilter · MenuGrid(MenuCard×n)
        │   ├── StorePage ─ StoreExperience (Canvas, Scene, Controls, Hotspots, UI overlay) | WebGLFallback
        │   ├── LocationPage ─ AddressCard(copy) · MapEmbed · DirectionsLinks
        │   └── NotFoundPage
        └── Footer
```

### 교차 브랜치 계약(Contract) — 병렬 작업 충돌 방지

| 계약 | 소유 | 소비 | 기반 단계에서 제공 |
|---|---|---|---|
| `src/components/three/StoreExperience.tsx` (default export, props 없음) | A04 | `StorePage` | 플레이스홀더 스텁 |
| `src/components/three/StorePreview.tsx` (default export, `{ className?: string }`) | A04 | 홈 `StorePreviewSection` (A03) | 플레이스홀더 스텁 |
| `src/data/menu.ts`의 `image` 경로 `/images/menu/{id}.webp` | A05가 파일 생성 | `MenuCard` | 데이터 확정 |
| `/images/hero/hero-portrait.webp`, `/images/hero/hero-wide.webp`, `/images/brand/philosophy.webp`, `/images/store/store-fallback.webp`, `/images/brand/og-image.webp` | A05 | A03/A04 | 경로만 확정 |
| `SmartImage` (로드 실패 시 `LeafPlaceholder`) | A02 | A03/A04 | 구현 |

## 5. 메뉴 데이터 구조

```ts
// src/types/menu.ts
export type MenuCategory = 'coffee' | 'non-coffee' | 'tea' | 'dessert';
export type Temperature = 'hot' | 'ice';
export interface MenuItem {
  id: string;              // kebab-case, 이미지 파일명과 동일
  name: string;            // 한글명
  nameEn: string;          // 영문명
  category: MenuCategory;
  description: string;     // 1~2문장
  temperatures: readonly Temperature[]; // 디저트는 []
  image: string;           // /images/menu/{id}.webp
  featured?: boolean;      // 홈 대표 메뉴 (4개)
}
export interface MenuCategoryInfo { id: MenuCategory; label: string; description: string; }
export type MenuFilter = MenuCategory | 'all';
```

유틸(`src/utils/menu.ts`): `filterMenuItems(items, filter)`, `parseMenuFilter(value: string | null): MenuFilter`, `countByCategory(items)`, `getFeaturedItems(items)`.

## 6. 매장 정보 구조

```ts
// src/types/cafe.ts
export interface CafeLocation {
  address: string;              // 경기도 안양시 동안구 경수대로 940
  coordinates: { lat: number; lng: number } | null; // 지오코딩 확인값
  mapEmbedUrl: string;          // OpenStreetMap embed
  naverMapUrl: string;          // 네이버지도 검색/길찾기
  kakaoMapUrl: string;          // 카카오맵 길찾기
  description: string;
}
```

## 7. Three.js 통합 구조

- `StoreExperience` → WebGL 감지(`isWebGLAvailable`) → 불가 시 `WebGLFallback`
- `<Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }}>` 안에 `CafeScene`(정적 지오메트리), `Lighting`, `Hotspots`, `CameraRig`(모드별 컨트롤)
- 상태: `StoreExperience` 내부 `useState`(mode, activeHotspotId) — 전역 상태 라이브러리 불필요
- 로딩: `Suspense` + drei `useProgress` → `LoadingOverlay`
- 상세는 `07-threejs-planning.md`

## 8. 성능 전략

- 코드 스플리팅: `/store` lazy, 홈 3D 미리보기는 `IntersectionObserver`로 화면 진입 시 lazy import
- 이미지: WebP, 명시적 크기, lazy, 히어로 우선순위
- 렌더: `React.memo` 카드, 필터 결과 `useMemo`, 상수 데이터는 모듈 레벨
- 3D: 07 문서의 최적화 항목
- 폰트: `preconnect` + `display=swap`, Pretendard dynamic subset

## 9. 오류 처리 전략

| 상황 | 처리 |
|---|---|
| 알 수 없는 경로 | `NotFoundPage` |
| lazy 청크 로드 실패 / 런타임 오류 | `ErrorBoundary`(common) → "다시 시도" 버튼 |
| WebGL 미지원/컨텍스트 손실 | `WebGLFallback` |
| 이미지 로드 실패 | `SmartImage` → `LeafPlaceholder` |
| 클립보드 API 실패 | `textarea` + `execCommand('copy')` 대체, 그래도 실패 시 "직접 복사해 주세요" 안내 |
| 잘못된 필터 쿼리 | `parseMenuFilter`가 `'all'` 반환 |
