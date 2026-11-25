# A16 회원·구매·리뷰 QA

작업 브랜치는 `test/commerce-qa`다. 앱 코드는 고치지 않았다. 건드린 파일은 `tests/e2e/commerce/**`(새 폴더), `playwright.config.ts`, `docs/11-test-strategy.md`, 이 로그뿐이다.

## 구성

- `playwright.config.ts`: 기존 `npm run build && npm run preview`(포트 4173, 기본 빌드)는 그대로 두고, 두 번째 `webServer`를 더했다. `VITE_COMMERCE_BACKEND=memory vite build --outDir node_modules/.cache/haru-commerce-memory`로 따로 빌드해 4183에서 서빙한다. `dist`와 섞이지 않고 `.gitignore` 대상이다. 포트는 `E2E_PORT`, `E2E_COMMERCE_PORT`로 바꿀 수 있다.
- 프로젝트는 서로 겹치지 않는다(`playwright test --list`: 37 + 37 + 121 + 112 + 3 = 310).
  - `desktop-chromium`, `mobile-chromium`: `tests/e2e/commerce`를 제외한 기존 스펙 7개 파일, 프로젝트마다 37개. 기존 스펙은 한 줄도 바꾸지 않았다.
  - `commerce-desktop`(1440×900) 121개, `commerce-mobile`(Pixel 7) 112개: 메모리 빌드. 모바일은 뷰포트를 스스로 정하는 `layout`과 키보드 전용 `keyboard`를 뺐다.
  - `commerce-default-build` 3개: 기본 빌드에서 `unconfigured.spec.ts`만.
- 기존 스펙의 내비게이션 단언(링크 이름 지정, 활성 항목 1개)은 네 번째 항목 "리뷰" 때문에 깨지지 않았다. 고친 기존 단언은 없다.
- `helpers.ts`의 `test`는 기존 fixture(같은 출처 콘솔 오류·pageerror 0건)에 모든 테스트에서 자동으로 다음을 더한다: 결제사 호스트 요청 0건, 글꼴·지도 허용 목록 밖 외부 요청 0건, GET이 아닌 요청 0건.
- 아이디는 `uid()`로 테스트마다 다르다. 두 사용자 테스트는 한 컨텍스트에서 로그아웃 후 다른 아이디로 가입해 같은 localStorage 저장소를 공유한다.
- 앱 버그를 문서화한 테스트는 `test.fail(true, 'BUG-nn …')`로 두었다. 목록에서 `✘`로 표시되지만 "예상된 실패"라 통과로 센다. 앱이 고쳐지면 "예상과 달리 통과"로 실패하므로 그때 `test.fail`을 지운다. 각각 `test.fail`을 지운 사본으로 실패 이유를 따로 확인했다.

## U 요구사항 → 스펙

| ID | 내용 | 스펙 (테스트) |
|---|---|---|
| AU-01 | 가입·로그인·로그아웃 | `auth.spec.ts` (가입→새로고침→로그아웃→재로그인, 보호 주소 복귀, 틀린 비밀번호, 빈 칸, 이미 로그인 시 홈), `keyboard.spec.ts` |
| AU-02 | 아이디 4자 이상 | `auth.spec.ts` 3자 거부, 4자 허용, 한글·밑줄·공백·하이픈·21자 거부, 20자 허용 |
| AU-03 | 비밀번호 영문·숫자만 | `auth.spec.ts` 기호·한글·가운데/앞/뒤 공백·밑줄 6가지 거부 |
| SH-01 | 담기, HOT/ICE 선택 | `cart.spec.ts` (23개 카드 모두 담기, 두 온도 메뉴만 라디오, 같은 메뉴·온도 합침), `keyboard.spec.ts` |
| SH-02 | 수량·삭제·합계·헤더 수량 | `cart.spec.ts` (±, 1·20 경계, 삭제 확인 취소/확정, 빈 장바구니, 두 자리 수량), `layout.spec.ts` (12개) |
| SH-04 | 테이크아웃/매장 선택 | `checkout.spec.ts` 4조합, 미선택 검증 |
| SH-05 | 현장/온라인 결제 선택 | `checkout.spec.ts` 4조합 |
| SH-06 | 실결제 없음, 결제 정보 미수집 | `checkout.spec.ts` (결제 창에 input·iframe 0, 카드 문구 없음), `helpers.ts` 자동 네트워크 검사, `unconfigured.spec.ts` |
| RV-01 | 구매한 메뉴만 | `reviews.spec.ts` 주문 없음·주문에 없는 메뉴·남의 주문, 주문 상세 링크 |
| RV-02 | `/reviews` 비로그인 열람 | `reviews.spec.ts`, `access.spec.ts` |
| RV-03 | 별점·글 필수, 사진 선택 | `reviews.spec.ts` (검증·초점, 500/501자, 사진 없음, PNG·JPEG·WebP, 1200px 축소, GIF·10MB 거절) |
| RV-04 | 내 리뷰만 수정·삭제 | `reviews.spec.ts` 두 사용자, 수정(별점·글·사진 3경우), 삭제 확인 |
| RV-05 | 끝 2글자 `**`, 원본 아이디 미노출 | `reviews.spec.ts` (혼합 대소문자 10자, 4자, 비회원·타 회원 화면의 text·html·alt·aria-label에 원본 없음) |

D 요구사항도 같이 덮었다: AU-04 대소문자 중복, AU-05 5자·확인 칸, AU-06 새로고침 유지, AU-07 안내 문구와 비밀번호 비노출, SH-03 병합, SH-07 취소·중복 주문·뒤로가기, SH-08 남의 주문, RV-06 중복, RV-07 글자 수·사진, RV-08 필터·정렬·평균, RV-09 삭제 확인·빈 상태.

## 추가로 확인한 것

- 비밀번호는 입력 중·가입 직후·새로고침 뒤·로그인 실패 뒤 URL, 화면 글, HTML, localStorage/sessionStorage, 쿠키 어디에도 없다. 엔터로 제출해도 주소에 붙지 않는다.
- 온라인 결제 창: input·textarea·select·iframe 없음, 버튼은 취소·승인 두 개, Esc로 닫히고 초점이 "모의 결제하기" 버튼으로 돌아온다, 열린 동안 Tab이 뒤쪽 페이지로 가지 않는다.
- 주문하기·승인 더블클릭, Enter 3연타, 두 탭 동시 주문 모두 주문 1건. 주문 뒤 뒤로가기는 장바구니로 가고, 앞으로·새로고침·직접 `/checkout` 이동으로 두 번째 주문이 생기지 않는다.
- 로그인 `next`: `https://…`, `//…`, `/\…`, `javascript:`, `/login`, `/signup`은 홈으로 간다.
- 내 계정 메뉴: Enter로 열고 Esc로 닫으면 초점이 버튼으로 돌아온다.
- 키보드만(클릭 없음)으로 가입 → 담기 → 장바구니 → 결제 → 모의 승인 → 리뷰 쓰기 → 삭제 확인 취소까지 간다.
- 375px·768px: 비회원 화면 7개와 오류 상태, 회원 화면(주문 상세, 긴 글+사진 리뷰, 수정, 쓰기 오류, 결제 오류, 모의 결제 창, 두 자리 수량 머리글, 계정 메뉴 열림)에서 `scrollWidth` 초과와 화면 밖 요소가 0건. 머리글 요소 겹침·높이 증가 0건, 375px 머리글 컨트롤 44px 이상. 측정기가 실제로 넘침을 잡는지 600px 요소를 일부러 넣어 확인했다.
- 키 없는 기본 빌드: 회원·구매·리뷰 화면은 준비 안내만, 담기 버튼 없음, 번들 어디에도 `haru-leaf:memory`·`service_role` 없음, localStorage 흔적 없음.

## 검증 결과 (최종 실행)

```
npm run typecheck   종료 코드 0
npm run lint        종료 코드 0, 경고·오류 0건
npm run test        Test Files  39 passed (39) / Tests  264 passed (264)
npm run test:e2e    3 skipped / 307 passed (11.4m), 종료 코드 0
```

- 건너뜀 3건은 모두 기존 스펙의 조건부 skip이다(`routing.spec.ts:77` 모바일 뷰포트 전용을 데스크톱에서, `store.spec.ts:129` 모바일 전용을 데스크톱에서, `store.spec.ts:45` 데스크톱 전용을 모바일에서). 새 스펙은 skip이 없다.
- 307건 통과에는 예상된 실패(`test.fail`) 6건이 포함된다: BUG-01 2건(데스크톱·모바일), BUG-02·BUG-03 각 1건(데스크톱), BUG-05 2건.
- 이전 전체 실행(스펙 보강 전): `2 failed / 3 skipped / 301 passed`. 실패 2건은 내 테스트의 잘못이었다(필터 `<select>`를 라벨 이름으로 정확히 찾지 못함). 앱 문제가 아니라서 선택자를 고쳤고, 고친 뒤 데스크톱·모바일 모두 통과했다.
- 개발 중 보인 불안정 2건과 처리: ① 리뷰 저장 직후 "내 계정"을 열면 메뉴가 닫혀 로그아웃 클릭이 실패 — 앱 쪽 BUG-04, 도우미가 안내 문구 기록 정리를 기다리게 해 피했다. ② 오래 걸리는 시나리오가 30초 기본 제한에 걸림 — commerce 프로젝트만 60초로 늘렸다(기존 프로젝트는 그대로).
- 최종 실행에서 재시도·플레이크는 0건이다. 테스트 실행 중 머신 부하(load average 약 10)가 높았다.

## 앱 버그 (심각도순)

### BUG-02 (중간) 키보드로 "담기"를 누르면 초점이 사라진다
- 재현: 메뉴소개에서 Tab으로 쿠키 카드의 "담기"에 가서 Enter. 담기 완료 직후 `document.activeElement`가 `BODY`이고, 다음 Tab은 문서 맨 위(로고 링크)에서 시작한다. Space·Enter를 다시 눌러도 반응이 없어 두 번째 담기를 하려면 다시 처음부터 Tab해야 한다.
- 기대: 버튼에 초점이 남는다. 실제: 처리 중 `disabled`가 되어 브라우저가 초점을 버린다.
- 위치: `src/components/cart/AddToCart.tsx:56` `<Button disabled={pending || …}>`. `aria-disabled`와 클릭 무시로 바꾸면 된다.
- 재현율: 전체 실행 2회와 `test.fail`을 뺀 단독 확인 실행에서 모두 같았다. 테스트 `keyboard.spec.ts` BUG-02.

### BUG-03 (중간) 장바구니 수량 버튼을 키보드로 누르면 초점이 사라진다
- 재현: `/cart`에서 Tab으로 "쿠키 수량 늘리기"에 가서 Enter. 수량은 2개로 바뀌지만 초점이 `BODY`로 간다.
- 위치: `src/pages/CartPage.tsx:77,82,88` 수량 줄이기·늘리기·삭제 버튼의 `disabled={busy …}`. BUG-02와 같은 원인.
- 재현율: 전체 실행 2회와 단독 확인 실행에서 모두 같았다. 테스트 `keyboard.spec.ts` BUG-03.

### BUG-01 (낮음) 확인 칸에 틀린 값을 쓰고 마우스로 가입 버튼을 한 번 누르면 클릭이 사라진다
- 재현: `/signup`에서 아이디·비밀번호를 쓰고 비밀번호 확인 칸에 다른 값을 쓴 뒤 "회원가입" 버튼을 마우스로 한 번 클릭.
- 기대: 제출 검사가 돌고 확인 칸에 초점. 실제: mousedown에서 확인 칸이 blur되며 오류 문구가 생기고 버튼이 28px 아래로 밀려, mouseup이 버튼 밖에서 일어나 클릭 이벤트가 버튼에 오지 않는다. 초점은 버튼에 남고 오류 문구만 보인다. 두 번째 클릭부터 정상이다.
- 위치: `src/components/auth/CredentialsForm.tsx:95` `onBlur`로 오류를 즉시 띄우는 부분. 오류 영역 높이를 미리 확보하거나 `onMouseDown`에서 `preventDefault`로 blur를 늦추면 된다.
- 재현율: 전체 실행 2회 × 두 프로젝트 모두, 단독 확인 실행 1회. 같은 구조가 로그인 폼에도 있을 수 있으나 따로 확인하지 않았다. 테스트 `auth.spec.ts` BUG-01.

### BUG-04 (낮음) 리뷰를 저장하고 돌아온 직후 "내 계정" 메뉴를 열면 스스로 닫힌다
- 재현: 리뷰를 남기면 `/reviews?mine=1`로 온다. 도착 직후 "내 계정"을 클릭하면 열렸다가 곧 닫힌다.
- 원인 추정: `ReviewsPage`가 안내 문구를 받은 뒤 `navigate(…, { replace: true, state: null })`로 기록을 정리하고(`src/pages/ReviewsPage.tsx:79-82`), `AccountMenu`가 `key={location.key + user.id}`로 그려져(`src/components/auth/AccountMenu.tsx:109`) location.key가 바뀌면 다시 마운트되어 닫힌다.
- 재현율: 통제 실험 9/9(3회 × 3건). 도착 후 수백 ms 이내에만 해당해 사용자가 겪을 가능성은 낮다. 자동 테스트는 시간 의존이라 `test.fail`로 두지 않았다.

### BUG-05 (낮음) 사진 오류 문구가 스크린리더에 알려지지 않는다
- 재현: 리뷰 쓰기에서 GIF를 고른다. 오류 `<p id="review-photo-error">`는 화면에 보이지만 `role="alert"`도 live region도 아니다. 초점이 움직이지 않아 다음에 입력칸으로 돌아오기 전에는 알 수 없다.
- 위치: `src/components/reviews/FieldError.tsx` / `src/components/reviews/PhotoField.tsx:122`. 별점·글 오류는 초점이 그 칸으로 가므로 해당하지 않는다.
- 재현율: 전체 실행 1회(두 프로젝트), 단독 확인 실행 1회. 테스트 `reviews.spec.ts` BUG-05.

### 버그가 아닌 관찰
- 단일 온도 메뉴(에스프레소 등)는 "에스프레소 HOT"으로 담긴다. 의도된 동작으로 보고 테스트도 그 이름을 쓴다.
- 모의 결제 창은 네이티브 모달이라 마지막 버튼에서 Tab을 누르면 브라우저 화면(문서 `body`)으로 나가지만 뒤쪽 페이지에는 닿지 않는다.
- `/orders/%E0%A4%A`처럼 깨진 퍼센트 인코딩은 `vite preview`가 서버 단에서 404를 돌려준다. 앱 문제가 아니라 서버 동작이어서 해당 케이스는 뺐다. Vercel에서는 확인하지 않았다.

## 확인하지 못한 항목

- 실제 Supabase(Auth·RLS·RPC·Storage·공개 사진 URL). 메모리 백엔드만 시험했다. RV-05의 "가리기는 DB에서 하고 원본 아이디를 브라우저로 보내지 않는다"는 메모리 API가 가리는 것까지만 봤고, 서버 응답 본문은 확인하지 못했다.
- Chromium(Chrome for Testing 헤드리스)만 시험했다. Safari·Firefox, 실제 iPhone·Android 기기, 터치 입력, HEIC 사진, 실제 스크린리더 음성.
- 실제 대용량 사진 업로드. 10MB 경계는 이미지가 아닌 바이트로 크기 검사만 확인했고, 큰 실제 사진(EXIF 회전 등)은 A15가 확인한 범위를 넘지 않았다. 캔버스로 만든 3000×2000 JPEG의 1200px 축소만 확인했다.
- `main`과 비교한 플레이크 판정. 이 작업 트리 밖의 체크아웃을 건드리지 않는다는 규칙 때문에 `main`에서 기존 스펙을 돌려 보지 않았다. 대신 기존 스펙이 이 브랜치에서 통과(3건 skip은 기존 조건부 skip)하는 것만 확인했다.
- 탭 간 세션 동기화(메모리 백엔드의 `storage` 이벤트)는 로그인 상태를 공유하는 두 탭 시나리오 일부(주문·리뷰 동시 저장)만 시험했다.
- Vercel 배포본, 실제 도메인의 리라이트, 보안 헤더. 로컬 `vite preview`의 SPA 폴백만 썼다.
- 성능·부하, 리뷰가 아주 많을 때(A15가 알린 페이지 나누기 없음).
- `.env.local`에 Supabase 키가 있으면 `unconfigured.spec.ts`의 가정이 깨진다. 이 작업 트리에는 `.env.local`이 없다.

## Requests to orchestrator

1. 병합 전에 BUG-02·BUG-03(키보드 초점)은 고치는 것이 좋다. 고치면 `keyboard.spec.ts`의 `test.fail`이 "예상과 달리 통과"로 실패하므로 그 줄을 지워 달라.
2. 다른 작업 트리에서 이미 4173·4183 포트를 쓰고 있으면 `reuseExistingServer`가 엉뚱한 빌드를 재사용한다. 그때는 `E2E_PORT`, `E2E_COMMERCE_PORT`를 바꿔 실행한다.
