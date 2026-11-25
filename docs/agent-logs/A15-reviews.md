# A15 리뷰 화면

작업 브랜치는 `feature/reviews`다. 리뷰를 카드에 가두지 않고 헤어라인으로 나눈 읽을거리로 보여 준다. 글은 세리프, 별은 `walnut`, 왼쪽 단에 평균과 조건을 둔다. 바꾼 파일은 `src/pages/Review{s,Form}Page*`, `src/components/reviews/**`, `src/utils/photo*`, 이 로그뿐이다.

## 구현 범위

| 요구사항 | 구현 | 테스트 |
|---|---|---|
| RV-01 | 새 리뷰는 `orders.get`으로 주문을 확인한다. 없는 주문·남의 주문·주문에 없는 메뉴면 폼 대신 이유와 주문 내역 링크를 보여 준다. | `ReviewFormPage.test.tsx` |
| RV-02 | `/reviews`는 로그인 없이 열린다. 불러오는 중, 오류와 다시 불러오기, 빈 상태를 나눴다. | `ReviewsPage.test.tsx` |
| RV-03 | 별점은 네이티브 라디오 묶음(방향키), 글은 필수, 사진은 선택. 저장을 누르면 첫 오류 칸으로 초점이 간다. 수정에서는 사진 유지·교체·빼기·되돌리기. | `ReviewFormPage.test.tsx` |
| RV-04 | `isMine`인 리뷰에만 수정·삭제가 보인다. 수정 화면은 내 리뷰 목록에서만 찾으므로 남의 리뷰 주소는 거절한다. 계정이 바뀌면 이전 계정의 목록을 쓰지 않는다. | 두 페이지 테스트 |
| RV-05 | `authorMasked`를 그대로 쓴다. 브라우저에서 가리거나 바꾸지 않는다. | `ReviewsPage.test.tsx` (DOM에 원본 아이디 없음) |
| RV-06 | 이미 쓴 주문·메뉴면 수정 링크를 준다. 쓰는 사이 중복이 생기면 글을 지우지 않고 알린다. | `ReviewFormPage.test.tsx` |
| RV-07 | 글자 수는 저장 규칙과 같은 방식(앞뒤 공백 제외, 이모지 한 글자)으로 센다. 사진은 읽기 전에 형식·10MB를 검사하고 긴 변 1200px WebP(안 되면 JPEG)로 다시 인코딩한다. 2MB를 넘으면 화질을 낮춘다. object URL은 교체·빼기·화면 이탈 때 해제한다. | `photo.test.ts`, `reviewQuery.test.ts`, `ReviewFormPage.test.tsx` |
| RV-08 | 평균·개수(현재 조건 기준), 메뉴·내 리뷰·정렬을 모두 URL 쿼리에 둔다. 모르는 값은 무시하고 다른 쿼리는 남긴다. 늦게 도착한 이전 결과는 버린다. 비회원의 `mine=1`은 로그인 안내. | `ReviewsPage.test.tsx`, `reviewQuery.test.ts` |
| RV-09 | 삭제는 화면 안 확인 단계. 열면 `남겨 두기`, 취소·Esc면 삭제 버튼, 삭제하면 이웃 리뷰(없으면 안내)로 초점이 간다. 빈 상태 4종(전체 없음, 메뉴 없음, 내 리뷰 없음, 내 리뷰 중 메뉴 없음). 소스에 예시 리뷰 없음. | `ReviewsPage.test.tsx` |

저장에 성공하면 `/reviews?mine=1`로 돌아가고 `location.state.reviewNotice`로 안내를 넘긴다. 새로고침 때 다시 나오지 않도록 받은 뒤 기록에서 지운다.

## 검증 결과

- `npm run typecheck && npm run lint && npm run test && npm run build` 종료 코드 0. ESLint 경고·오류 출력 없음.
- Vitest: `Test Files  34 passed (34)`, `Tests  225 passed (225)`. 기존 테스트는 고치지 않았다(추가 72건).
- 빌드: `ReviewsPage` gzip 4.48 kB, `ReviewFormPage` gzip 5.31 kB, 엔트리 `index` gzip 152.01 kB.
- 일부러 코드를 망가뜨린 7가지(초점 복귀, 소유자 버튼, object URL 해제, 계정 전환, 수정 대상 찾기, 늦은 응답, 삭제 뒤 초점)를 테스트가 잡는지 확인했다. 수정 대상 찾기는 처음에 통과해 버려 테스트를 보강했고, 이후 실패하는 것을 확인했다.
- Playwright Chromium, `VITE_COMMERCE_BACKEND=memory`, 포트 5180: 빈 목록·목록·결과 없음·삭제 확인·쓰기·오류·사진 선택·저장 후·이미 씀·수정 화면을 375px와 1440px로 찍어 확인했다(목록은 768px와 1024px에서 가로 넘침도 확인). 가로 넘침 0건, 콘솔 오류·경고 0건, 원본 아이디 노출 0건.
- 같은 실행에서 실제 JPEG(3000×4000, EXIF 회전 6, 표식 문자열 포함)를 올려 1200×900 WebP로 저장되고, 회전이 반영되고, EXIF 표식이 사라진 것을 확인했다. GIF, 10MB+1바이트, 깨진 PNG는 각각 안내가 나왔다.
- 스크린샷을 보고 고친 것: 보이지 않던 빈 별을 외곽선으로, 사진 아래로 밀리던 수정·삭제를 글 아래로, 별점을 고르지 않았는데 마우스 위치만으로 점수가 적히던 것, 왼쪽 단 링크 줄 간격, 좁은 화면 삭제 문구 줄바꿈.

## 확인하지 못한 항목

- 실제 Supabase Auth·RLS·Storage 연동과 공개 사진 URL. 소유권·구매 검사는 메모리 API로만 확인했다.
- Safari·Firefox, 실제 iPhone의 HEIC 선택. WebP 미지원 브라우저의 JPEG 전환은 모의 캔버스로만 테스트했다.
- 실제 스크린리더. 역할·이름·설명·초점은 자동 테스트와 Chromium으로 확인했다.
- 진짜 로그인·장바구니·주문 내역 화면을 거치는 흐름(A13·A14 화면은 이 브랜치에 없다). 사진 준비 중·저장 중 상태의 스크린샷.
- 리뷰가 아주 많을 때. 목록 API에 페이지 나누기가 없어 한 번에 모두 그린다.

## Requests to orchestrator

1. A14 주문 내역·상세에서 메뉴마다 `/reviews/new?order=<주문 id>&menu=<메뉴 id>` 링크가 필요하다. 리뷰 화면은 `/orders`로만 안내한다.
2. Supabase에서 UUID가 아닌 주문 번호로 `orders.get`을 부르면 Postgres `22P02`가 `unknown`으로 바뀐다. 잘못된 주소에서 "주문을 찾을 수 없어요" 대신 다시 불러오기가 나온다. `supabaseApi`나 `mapError`에서 `not-found`/`null`로 처리하면 좋다.
3. 오류 색 토큰이 없어 `walnut` 글자와 아이콘을 썼다. A13·A14 화면과 병합할 때 같은 규칙인지 봐 주세요.
