# 08. 에셋 기획

## 1. 생성 도구

- **Codex CLI 이미지 생성 기능**(`image_generation` feature, 로컬 환경에서 `stable/true` 확인됨)을 A05 에이전트가 `codex exec`로 호출한다.
- 생성 원본(PNG)은 `~/.codex/generated_images/…`에 저장되며, 에이전트가 프로젝트로 복사 후 `cwebp`(설치 확인: `/opt/homebrew/bin/cwebp`)로 WebP 변환·리사이즈한다.
- 생성 실패 시 실패 사실을 `docs/agent-logs/A05-visual-assets.md`에 기록하고, 사이트는 `LeafPlaceholder`로 동작한다(없는 기능을 실행했다고 기록하지 않는다).

## 2. 공통 스타일 프롬프트 (모든 이미지에 접두)

```text
Natural-light editorial photograph for a minimalist Korean neighborhood cafe brand called "a leaf for your day".
Warm soft morning sunlight from a side window, gentle leaf shadows, cream-beige and ivory background,
light oak and walnut wood surfaces, sage-green plant accents, low saturation, calm and premium mood,
shallow depth of field, no text, no logo, no watermark, no people's faces.
```

## 3. 이미지 목록

| 경로 | 비율 / 출력 크기 | 용도 | 개별 프롬프트 |
|---|---|---|---|
| `public/images/hero/hero-portrait.webp` | 4:5 / 1200×1500 | 홈 히어로(데스크톱 우측) | A ceramic cup of latte with delicate leaf latte art on a light oak table by a large window, a single small green leaf resting beside the saucer, soft leaf shadows across the table |
| `public/images/hero/hero-wide.webp` | 16:9 / 1920×1080 | 모바일 히어로·OG 원본 | Wide view of a sunlit minimalist cafe corner, oak bar table along a large window, potted olive tree and monstera, a latte cup on the table, cream plaster walls |
| `public/images/brand/philosophy.webp` | 3:2 / 1500×1000 | 철학 섹션 | Close-up of a young tree branch with fresh leaves in a ceramic vase on a walnut shelf, next to a hand-thrown coffee cup, morning light |
| `public/images/store/store-fallback.webp` | 16:9 / 1600×900 | WebGL 대체 UI | Interior of a calm natural cafe: walnut coffee bar counter with espresso machine, pastry display case, round oak tables, many indoor plants, large south-facing windows with warm sunlight and soft shadows |
| `public/images/brand/og-image.webp` | 1.91:1 / 1200×630 | OG 메타 이미지 | (hero-wide를 크롭해서 생성) |
| `public/images/menu/{id}.webp` ×23 | 1:1 / 800×800 | 메뉴 카드 | 아래 표 |

### 메뉴 이미지 (공통: "Top-down 45-degree view of a single serving on a light oak table, cream linen napkin, small leaf accent")

| id | 메뉴 | 개별 프롬프트 키워드 |
|---|---|---|
| `espresso` | 에스프레소 | small white demitasse with thick golden crema |
| `americano` | 아메리카노 | clear glass of iced americano with ice cubes (plus a subtle steam cup in background) |
| `cafe-latte` | 카페라떼 | ceramic cup of latte with rosetta latte art |
| `cappuccino` | 카푸치노 | cappuccino with thick milk foam dusted with cinnamon |
| `vanilla-latte` | 바닐라라떼 | latte with a vanilla pod beside the cup |
| `caramel-macchiato` | 카라멜 마키아토 | layered iced caramel macchiato with caramel drizzle in tall glass |
| `cafe-mocha` | 카페모카 | mocha with whipped cream and cocoa powder |
| `cold-brew` | 콜드브루 | cold brew coffee in glass with large clear ice, amber color |
| `chocolate-latte` | 초코라떼 | rich hot chocolate latte with cocoa dusting |
| `matcha-latte` | 말차라떼 | vivid green matcha latte with leaf latte art, small bamboo whisk |
| `sweet-potato-latte` | 고구마라떼 | creamy pale purple-yellow sweet potato latte, roasted sweet potato slice |
| `milk-tea` | 밀크티 | milk tea in glass with caramel tone, tea leaves scattered |
| `lemonade` | 레몬에이드 | sparkling lemonade with lemon slices and mint, tall glass |
| `grapefruit-ade` | 자몽에이드 | pink grapefruit ade with grapefruit wedge, sparkling |
| `earl-grey` | 얼그레이 | earl grey tea in clear glass teacup, bergamot orange peel |
| `chamomile` | 캐모마일 | pale golden chamomile tea with dried chamomile flowers |
| `peppermint` | 페퍼민트 | light green peppermint tea with fresh mint sprig |
| `yuja-tea` | 유자차 | Korean yuja citron tea with citrus peel strands in glass cup |
| `croissant` | 크루아상 | flaky butter croissant on ceramic plate |
| `financier` | 휘낭시에 | three golden brown-butter financiers |
| `scone` | 스콘 | rustic scone with clotted cream and jam |
| `cheesecake` | 치즈케이크 | slice of baked basque cheesecake with caramelized top |
| `cookie` | 쿠키 | stack of chewy chocolate chunk cookies |

## 4. 3D 텍스처 및 에셋

| 에셋 | 방식 | 비고 |
|---|---|---|
| 원목 마루 | 런타임 캔버스 절차적 텍스처(512²) | A04, 다운로드 없음 |
| 벽 회반죽 | 단색 + 약한 노이즈 캔버스 텍스처 | A04 |
| 창밖 정원 | 그라데이션 + 단순 나무 실루엣 메시 | A04 |
| 메뉴 보드 글자 | drei `Text` (기본 폰트, 영문 표기) — 한글 폰트 파일 로딩을 피하기 위해 영문 메뉴명 사용 | A04 |
| `public/textures/*` | **선택 사항**: A05가 시간 여유 시 `wood-oak.webp`(1024², 타일링) 생성. 없으면 절차적 텍스처 유지 | 의존성 없음 |

## 5. 기타 그래픽

- `public/favicon.svg`: `BrandLogo` 잎 심볼 (A02, 코드 작성)
- 404 일러스트: 인라인 SVG (A03)
- 섹션 장식 잎: Lucide `Leaf` + 인라인 SVG

## 6. 파일 형식 및 최적화

| 항목 | 기준 |
|---|---|
| 형식 | WebP (`cwebp -q 80 -m 6`) |
| 용량 | 메뉴 ≤ 120KB, 히어로·대체 이미지 ≤ 250KB |
| 리사이즈 | `cwebp -resize W H` 또는 `sips`로 크롭 후 변환 |
| 파일명 | kebab-case, 메뉴는 `MenuItem.id`와 동일 |
| 메타데이터 | 제거 (`-metadata none`) |
| 저장소 | 원본 PNG 커밋 금지, WebP만 커밋 |
| 기록 | 각 이미지의 사용 프롬프트·생성 도구·결과를 `docs/agent-logs/A05-visual-assets.md`에 표로 기록 |
