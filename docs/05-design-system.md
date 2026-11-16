# 05. 디자인 시스템

토큰은 `src/styles/index.css`의 Tailwind v4 `@theme` 블록에 정의하고, 3D 씬에서 쓰는 색은 `src/styles/tokens.ts`에서 동일 값으로 export 한다.

## 1. 색상 토큰

| 토큰 | HEX | Tailwind 클래스 예 | 용도 |
|---|---|---|---|
| `ivory` | `#F4F3EA` | `bg-ivory` | 페이지 기본 배경 (잎 그늘이 진 종이) |
| `cream` | `#EAEADB` | `bg-cream` | 섹션 교차 배경 (이끼빛) |
| `cream-deep` | `#DCDDC7` | `bg-cream-deep` | 강조 배경, 칩 |
| `line` | `#D6D5C0` | `border-line` | 구분선, 카드 테두리 |
| `sage` | `#94AE7E` | `bg-sage` | 잎 포인트, 아이콘 |
| `sage-soft` | `#DDE6CF` | `bg-sage-soft` | 배지 배경(ICE), 태그 |
| `sprout` | `#A8C66C` | `bg-sprout` | 새잎 연두: 오늘의 잎, 활성 표시, 숲 바탕 위 라벨. 면 채움 전용(밝은 바탕 위 글자 금지) |
| `forest` | `#2D4A35` | `bg-forest`, `text-forest` | 주 버튼, 제목, 푸터(숲) |
| `forest-deep` | `#1E3426` | `hover:bg-forest-deep` | 버튼 hover, 숲 가장자리 뒷줄 |
| `oak` | `#C9A27A` | `bg-oak`(결 텍스처) | 원목 테이블 상판 |
| `oak-light` | `#E6D3B5` | — | `.bg-oak` 바탕색 |
| `walnut` | `#6B4A33` | `text-walnut` | 섹션 앞 짧은 문구, 원목 포인트 |
| `walnut-soft` | `#EBD9C4` | `bg-walnut-soft` | 배지 배경(HOT) |
| `bark` | `#4A3628` | `stroke-bark` | 나뭇가지·줄기 선 |
| `ink` | `#2C2A22` | `text-ink` | 본문 텍스트 |
| `ink-soft` | `#5A574B` | `text-ink-soft` | 보조 텍스트 (ivory 대비 6.5:1) |

규칙: 그린은 면적 10% 이내 포인트(푸터 제외). 원목(`bg-oak`)은 메뉴 섹션 한 곳에만. 순수 흰색·검정 미사용. 그림자는 나무껍질 색(rgb 74 54 40) 기반.

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

## 9. 사용 지침 (2026-11-16 디자인 다듬기)

토큰 값은 바꾸지 않고, 쓰는 방식만 정리했다.

- **시그니처 요소는 하나만:** 홈 철학 섹션의 `WeekBranch`(이번 주의 가지). 월~일 일곱 장의 잎 중 지난 요일은 `sage`, 오늘은 `forest`, 남은 요일은 점선 윤곽으로 그린다. 화면에 들어올 때 줄기가 자라고 잎이 하나씩 돋는 것이 페이지의 유일한 자동 모션이다(reduced-motion이면 정지 상태).
- **Eyebrow 남용 금지:** 섹션 제목 위 영문 대문자 라벨(A leaf for today 등)은 쓰지 않는다. 섹션 앞 짧은 문구가 필요하면 `font-serif` + `text-walnut` 한국어로 쓴다. `.text-eyebrow` 토큰은 남겨 두되 정보가 있는 곳에만 쓴다.
- **카드 키트 지양:** 같은 모양 카드를 나열하는 대신, 성격이 다른 내용(브랜드 가치 등)은 `line` 헤어라인으로 나눈 열로 보여 준다. 카드 스타일(§4)은 메뉴 카드처럼 실제 개별 항목에만 쓴다.
- **순서가 아닌 목록에 번호(01, 02…)를 붙이지 않는다.** 매장 공간 목록은 3D 핫스팟과 같은 잎 표시를 쓴다.
- **히어로:** 오늘 날짜(`11월 16일 월요일, 오늘의 작은 쉼`)로 '하루'를 구체화하고, 데스크톱에서 사진을 화면 오른쪽 끝까지 붙인다.
- **주소는 세리프로 크게:** 홈 위치 요약과 오시는 길 주소 카드 모두 `font-serif` 700으로 강조한다.

## 10. 나무와 잎 테마 (2026-11-16)

페이지 전체를 '나무 아래에서' 보는 흐름으로 구성한다: 히어로는 나뭇잎 그림자(`LeafShade`), 메뉴는 원목 테이블(`bg-oak`), 푸터는 숲 가장자리 실루엣.

- **잎 모양 모서리:** 왼쪽 위·오른쪽 아래만 크게 둥글린다. `rounded-leaf-sm`(1.375rem/0.375rem: 버튼·칩·배지·로고), `rounded-leaf`(1.75rem/0.5rem: 카드·안내 상자), `rounded-leaf-lg`(2.75rem/0.75rem: 큰 사진·지도·3D 프레임). 새 UI도 원형(`rounded-full`) 대신 이 규칙을 쓴다.
- **나뭇잎 그림자:** 히어로 배경에만, 불투명도 13%, 14초 주기로 아주 느리게 흔들린다(`.animate-leaf-sway`, reduced-motion이면 정지).
- **이번 주의 가지:** 지난 요일은 다 자란 `forest` 잎, 오늘은 `sprout` 새잎, 남은 요일은 점선 윤곽. 줄기는 `bark`.
- **헤더 활성 표시:** 밑줄 대신 작은 `sprout` 잎.
