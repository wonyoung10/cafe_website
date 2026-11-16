# A03 — React Frontend Engineer

- 작업일: 2026-11-16
- 브랜치: `feature/react-frontend`
- 커밋하지 않음. 지정된 파일 범위만 생성·수정함.

## 구현 및 요구사항 매핑

- **HM-01..02**: 기존 헤더의 브랜드 노출을 유지하고 HeroSection을 구현했다. BRAND에서 메인·서브 카피를 읽으며 h1의 접근성 이름은 `당신의 하루에, 잎사귀 하나.`와 일치한다. 데스크톱 4:5 / 모바일 16:9 SmartImage를 우선 로드하고 메뉴·매장 CTA를 연결했다.
- **HM-03, HM-07**: 철학 인용, BRAND.story 두 문단, 철학 이미지, Lucide 아이콘 가치 카드 3개를 구현했다. 화면 진입 시 잎 7개가 순차적으로 채워진다. 미디어 쿼리 구독으로 reduced motion 환경에서는 지연·이동 애니메이션을 생략한다. Reveal은 가치 카드 그룹에만 사용했다.
- **HM-04**: getFeaturedItems로 추출한 MenuCard 4개와 전체 메뉴 링크를 배치했다. 홈 대표 메뉴는 모바일 2열 / 데스크톱 4열이다.
- **HM-05**: StorePreviewSection 프레임을 IntersectionObserver(rootMargin 200px)로 감지한 후에만 lazy StorePreview를 렌더링한다. Suspense와 ErrorBoundary에 각각 정적 잎 프레임과 안내 문구를 제공했다. 3D 소유 파일은 수정하지 않았다.
- **HM-06**: CAFE_LOCATION 주소와 MapPin, 위치 페이지 CTA를 연결했다. 홈은 ivory / cream / ivory / paper / ivory 톤으로 구성했다.
- **MN-01..02**: 기존 타입·메뉴 데이터·유틸을 그대로 사용했다. 전체 23 / Coffee 8 / Non-Coffee 6 / Tea 4 / Dessert 5.
- **MN-03, MN-08**: React.memo MenuCard에 SmartImage, 카테고리, 한·영 이름, 2줄 설명, HOT/ICE 배지를 제공한다. 디저트에는 온도 배지를 표시하지 않는다. 공통 SmartImage의 이미지 실패 대체 UI를 사용한다.
- **MN-04..05, MN-09**: 가로 스크롤 가능한 44px 이상 토글 버튼 그룹에 개수와 aria-pressed를 제공한다. useSearchParams + parseMenuFilter로 URL을 단일 상태 원천으로 사용한다. 필터 변경은 history에 push하고 전체 선택 시 category만 제거하며 다른 쿼리는 보존한다. 쿼리 변경 시 기존 ScrollToTop의 pathname/hash 계약과 preventScrollReset으로 스크롤을 유지한다. 선택 카테고리 설명과 aria-live 결과 개수를 제공한다.
- **MN-06..07**: 메뉴에 가격·주문 기능을 추가하지 않았다. 메뉴 페이지 그리드는 1 / sm 2 / lg 3 / xl 4열이다. Motion layout + AnimatePresence로 필터 전환을 구현하고 reduced motion 시 이동·지연을 생략한다.
- **LC-01..03**: 주소·우편번호, 선택 가능한 주소 텍스트, Clipboard API + textarea/execCommand 대체 복사, Copy/Check 전환, aria-live 성공·실패 피드백을 제공한다. 피드백은 2초 후 초기화하고 언마운트 시 타이머를 정리한다. 대체 복사는 기존 포커스·선택을 복원한다. 지도 iframe은 지정된 title/src/loading/referrerPolicy와 4:3 비율을 사용한다.
- **LC-04..07**: 공통 ExternalButtonLink로 네이버·카카오 길찾기를 연결하고 OpenStreetMap 확대 링크를 제공한다. 세 링크 모두 새 창과 noopener noreferrer를 사용한다. CAFE_LOCATION의 설명·안내만 표시하고 미확인 정보를 추가하지 않았다. lg 이상에서 정보와 지도를 2열로 배치했다.
- **RT-08, RT-12**: 낙엽 SVG와 정확한 404 제목, 홈·메뉴 복귀 CTA를 구현했다. 네 페이지 모두 useDocumentTitle을 사용하고 홈은 인자 없이 호출한다.

## 테스트

추가한 테스트는 MenuFilter, MenuCard, MenuPage, AddressCard, DirectionsLinks, HomePage, LocationPage, NotFoundPage를 검증한다.

주요 검증: Tea 클릭 후 카드 4개와 선택 상태, URL 직접 진입 dessert 5개/invalid 23개, 쿼리 보존과 category 제거, 뒤로/앞으로 필터 복원, 온도 배지와 디저트 배지 생략, Clipboard 성공·대체·실패와 피드백 초기화, 포커스 복원, 지도 속성, 외부 링크 보안 속성, 홈 카드·제목·CTA, 404 복귀 링크. 기존 라우터 및 공통 컴포넌트 테스트도 모두 통과했다.

## 검증 결과

지정된 검증 명령의 **3회차 실행에서 전체 성공**:

```text
npm run typecheck && npm run lint && npm run test && npm run build

> haru-leaf-cafe@0.1.0 typecheck
> tsc -b --noEmit

> haru-leaf-cafe@0.1.0 lint
> eslint .

 Test Files  13 passed (13)
      Tests  41 passed (41)
   Duration  1.51s

vite v8.3.8 building client environment for production...
✓ 2571 modules transformed.
dist/assets/StorePreview-xslwbBqM.js    0.20 kB │ gzip:   0.19 kB
dist/assets/StorePage-C56lMCLZ.js       0.31 kB │ gzip:   0.25 kB
dist/assets/index-B50aZhYX.js         443.99 kB │ gzip: 144.79 kB
✓ built in 143ms
```

- 타입 오류 없음. 린트 오류·경고 없음. `git diff --check` 통과.
- 1회차: 복사 훅의 불필요한 초기 대입 린트 오류를 수정했다.
- 2회차: 접근성 이름에서 텍스트 조각 사이의 공백 처리 차이로 테스트 3개가 실패했다. 필터에 명시적인 접근성 이름을 제공하고 외부 링크 테스트의 공백 매칭을 보완했다. history 테스트의 URL 표시를 일반 div로 바꿔 실제 live status와 구별했다.

## 열린 이슈 / 검증 한계

- Orca CLI 가이드를 읽고 브라우저 QA를 시도했으나 `orca ports --json`과 `orca tab list --json` 모두 `runtime_access_denied` / `EPERM`을 반환했다. 현재 세션은 권한 상승을 허용하지 않아 브라우저에 연결하지 못했다. **375px 가로 넘침, 768/1440px 시각 검증, 실제 reduced motion 화면 동작은 미검증**이다. 고정 폭을 피하고 min-w-0, 반응형 그리드, 필터 내부 overflow-x-auto로 구성했다.
- 이미지 파일은 A05 통합 전이며 SmartImage 플레이스홀더 사용은 예상된 동작이다.
- StorePreview는 현재 워크트리의 계약 스텁이다. 코드 분리는 빌드에서 확인했고 실제 3D 렌더·성능은 A04 통합 후 확인해야 한다.

## Requests to orchestrator

- A05 에셋과 A04 StorePreview 통합 후 홈 이미지/미리보기의 실제 화면을 확인해 주세요.
- 샌드박스 밖의 허용된 브라우저 환경에서 375px 가로 넘침, 768/1440px 레이아웃, 필터 변경 시 스크롤 유지, 뷰포트 진입 전 3D 미요청 및 진입 후 로딩, reduced motion 동작을 확인해 주세요.
- 공통 컴포넌트·데이터·스타일 변경 요청은 없습니다.
