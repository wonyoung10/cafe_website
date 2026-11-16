# 05. 디자인 시스템

토큰은 `src/styles/index.css`의 Tailwind v4 `@theme` 블록에 정의하고, 3D 씬에서 쓰는 색은 `src/styles/tokens.ts`에서 동일 값으로 export 한다.

## 1. 색상 토큰

| 토큰 | HEX | Tailwind 클래스 예 | 용도 |
|---|---|---|---|
| `ivory` | `#FBF8F1` | `bg-ivory` | 페이지 기본 배경 |
| `cream` | `#F3EBDD` | `bg-cream` | 섹션 교차 배경, 카드 이미지 바탕 |
| `cream-deep` | `#E8DCC6` | `bg-cream-deep` | 강조 배경, 칩 |
| `line` | `#E2D7C5` | `border-line` | 구분선, 카드 테두리 |
| `sage` | `#A7B596` | `bg-sage` | 포인트(잎), 활성 밑줄 |
| `sage-soft` | `#DCE3D1` | `bg-sage-soft` | 배지 배경(ICE), 태그 |
| `forest` | `#2F4A3A` | `bg-forest`, `text-forest` | 주 버튼, 활성 텍스트, 푸터 |
| `forest-deep` | `#213529` | `hover:bg-forest-deep` | 버튼 hover |
| `walnut` | `#6E4F3A` | `text-walnut` | eyebrow, 원목 포인트 |
| `walnut-soft` | `#EADBCB` | `bg-walnut-soft` | 배지 배경(HOT) |
| `ink` | `#2B2A26` | `text-ink` | 본문 텍스트 |
| `ink-soft` | `#5E5A52` | `text-ink-soft` | 보조 텍스트 (ivory 대비 6.4:1) |

규칙: 그린은 면적 10% 이내 포인트. 순수 흰색·검정 미사용.

## 2. 폰트와 타이포그래피

| 역할 | 폰트 | 로딩 |
|---|---|---|
| 본문/UI (`font-sans`) | **Pretendard Variable** | jsDelivr CDN dynamic-subset CSS |
| 제목/카피 (`font-serif`) | **Gowun Batang (고운바탕)** 400/700 | Google Fonts, `display=swap` |

| 스타일 | 크기 (모바일 → 데스크톱) | 굵기 | 행간 | 자간 |
|---|---|---|---|---|
| Display (h1 히어로) | 36px → 64px (`clamp`) | serif 700 | 1.25 | -0.02em |
| H1 페이지 제목 | 30px → 44px | serif 700 | 1.3 | -0.01em |
| H2 섹션 | 24px → 34px | serif 700 | 1.35 | -0.01em |
| H3 카드 | 18px → 20px | sans 600 | 1.4 | 0 |
| Eyebrow | 12px → 13px | sans 600, uppercase, `tracking-[0.18em]` | — | — |
| Body | 16px → 17px | sans 400 | 1.75 | 0 |
| Small | 14px | sans 400 | 1.6 | 0 |

한글은 `word-break: keep-all` 적용으로 어절 단위 줄바꿈.

## 3. 버튼

| 변형 | 스타일 |
|---|---|
| `primary` | `bg-forest text-ivory hover:bg-forest-deep`, rounded-full, h-12 px-6 |
| `secondary` | `bg-transparent border border-forest/30 text-forest hover:bg-forest/5` |
| `ghost` | 텍스트 + 화살표 아이콘, hover 시 밑줄 |
| `chip` (필터) | `rounded-full h-10 px-4 border-line`, 선택 시 `bg-forest text-ivory` |

`Button`은 `as` 대신 별도 `ButtonLink`(React Router `Link` 래핑) 컴포넌트로 제공. 아이콘은 Lucide, 18px, `aria-hidden`.

## 4. 카드

- 배경 `ivory`, 테두리 `line` 1px, `rounded-3xl`, 그림자 `shadow-soft` (`0 1px 2px rgb(43 42 38 / .04), 0 8px 24px -12px rgb(43 42 38 / .12)`)
- 이미지 영역 `aspect-square bg-cream overflow-hidden rounded-[1.25rem]` (카드 내부 패딩 12px)
- 텍스트 영역 패딩 `px-2 pb-2 pt-4`

## 5. 간격과 여백

- 기본 4px 스케일 (Tailwind 기본)
- 섹션 세로 여백: 모바일 `py-20`(80px) → 데스크톱 `py-28`(112px)
- 컨테이너: `max-w-6xl`(1152px) + 좌우 `px-5`(모바일) / `px-8`(md 이상)
- 그리드 간격: 카드 `gap-5` → `gap-6`

## 6. 반응형 기준

| 브레이크포인트 | 폭 | 주요 변화 |
|---|---|---|
| base | < 640 | 1열, 햄버거 메뉴, 방향 패드 |
| `sm` | ≥ 640 | 메뉴 2열 |
| `md` | ≥ 768 | 헤더 가로 내비, 2단 레이아웃 시작 |
| `lg` | ≥ 1024 | 히어로 2단, 메뉴 3열, 매장 사이드 목록 |
| `xl` | ≥ 1280 | 메뉴 4열 |

테스트 기준 뷰포트: 375×812(모바일), 768×1024(태블릿), 1440×900(데스크톱).

## 7. 이미지 사용 규칙

- 형식: WebP (품질 80), 원본 PNG는 저장소에 넣지 않음
- 메뉴 이미지 1:1 (800×800), 히어로 4:5 (1200×1500) 및 16:9 (1920×1080) 2종, 기타 섹션 3:2
- 톤: 자연광, 따뜻한 화이트밸런스, 크림/원목 배경, 낮은 채도, 텍스트·로고·워터마크 없음
- 모든 `<img>`에 `width`/`height`(또는 aspect 박스), `loading="lazy"`(히어로 제외), `decoding="async"`
- 히어로 이미지는 `fetchpriority="high"`
- 로드 실패 시 `LeafPlaceholder`(SVG) 표시

## 8. 아이콘·그래픽

- Lucide: `Leaf`, `Coffee`, `MapPin`, `Copy`, `Check`, `ArrowRight`, `ExternalLink`, `Menu`, `X`, `RotateCcw`, `Maximize`, `Move`, `Footprints`, `Orbit`
- 브랜드 심볼: 단순한 잎 SVG(`BrandLogo`) — 줄기 1개 + 비대칭 잎 1장, 포레스트 그린
