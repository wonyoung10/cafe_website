# 카페 웹사이트에 Supabase 연결하기

회원가입, 장바구니, 주문, 리뷰 사진을 저장할 카페 전용 프로젝트를 준비합니다.

## 1. 프로젝트 만들기

1. Supabase 대시보드에 로그인하고 **New project**를 누르세요.
2. 조직, 프로젝트 이름, 데이터베이스 비밀번호와 가까운 지역을 선택하고 프로젝트를 만드세요. 데이터베이스 비밀번호는 비밀번호 관리자에 보관하세요.
3. 프로젝트가 준비되면 왼쪽 메뉴에서 **Authentication**을 여세요.

## 2. 이메일 로그인 설정하기

1. **Authentication → Sign In / Providers**에서 이메일과 비밀번호로 가입할 수 있도록 **Email**과 신규 가입을 켜세요.
2. **Confirm email**을 끄세요. 카페는 아이디를 내부 이메일 주소로 바꿔 가입하므로 확인 메일을 받을 수 없습니다.
3. 이메일 로그인 설정의 **Minimum password length**를 `6`으로 저장하세요. 추가 문자 조합 요구는 해제하세요. 카페는 영문과 숫자를 허용하며 영문만 또는 숫자만으로도 가입할 수 있습니다.

## 3. 데이터베이스 준비하기

1. 카페 프로젝트의 **SQL Editor → New query**를 여세요.
2. [schema.sql](./schema.sql)의 처음부터 마지막 `commit;`까지 복사해서 붙여넣고 **Run**을 누르세요. 테스트 폴더의 SQL은 로컬 검증용입니다.
3. 완료 메시지를 확인하세요. 같은 파일을 다시 실행해도 기존 회원, 주문과 리뷰는 유지되며 메뉴 이름·가격·온도는 파일의 값으로 갱신됩니다.
4. 새 쿼리에서 아래 내용을 실행하세요. 첫 결과가 `23`이고 두 번째 결과가 여섯 행 모두 `true`이면 메뉴 시드와 앱 테이블의 행 보안이 적용되었습니다.

```sql
select count(*) as menu_count from public.menu_items;

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles','menu_items','cart_items','orders','order_lines','reviews')
order by relname;
```

5. **Storage**에서 공개 버킷 `review-photos`가 보이는지 확인하세요. 업로드 제한은 파일당 2 MiB이며 JPEG, PNG, WebP를 허용합니다. 공개 사진은 주소를 아는 사람이 볼 수 있고 파일 목록은 로그인한 회원의 폴더로 제한됩니다.

## 4. 내 컴퓨터에서 연결하기

1. 프로젝트의 **Connect** 또는 **Project Settings → API Keys**에서 **Project URL**과 **Publishable key**를 복사하세요. 키 이름이 `sb_publishable_`로 시작하는지 확인하세요.
2. 카페 소스의 `package.json`과 같은 폴더에 `.env.local`을 만들고 아래 두 값을 채우세요.

```dotenv
VITE_SUPABASE_URL=https://<프로젝트-ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<프로젝트의-publishable-key>
```

**Secret key**, `service_role` 키와 데이터베이스 비밀번호는 이 파일, 소스 코드, Vercel에 넣지 마세요. `VITE_` 변수의 값은 방문자 브라우저에 전달됩니다.

3. 개발 서버를 실행 중이면 종료하고 `npm run dev`로 다시 시작하세요. `VITE_COMMERCE_BACKEND=memory` 설정을 사용 중이면 제거하고 다시 시작해야 실제 Supabase로 연결됩니다.

## 5. Vercel에서 연결하기

1. 카페의 Vercel 프로젝트에서 **Settings → Environment Variables**를 여세요.
2. 위 두 변수의 이름과 값을 각각 등록하세요. 운영 배포는 **Production**, 미리보기에서도 연결하려면 **Preview**를 선택하세요.
3. **Deployments**에서 해당 배포를 **Redeploy**하세요. 환경 변수는 새 빌드부터 적용됩니다.

## 6. 회원·주문·리뷰 확인하기

회원·구매 화면이 포함된 버전에서 다음 순서로 확인하세요.

1. 새 아이디로 가입해 확인 메일 없이 로그인되는지 확인하세요. Supabase의 **Authentication → Users**에는 내부 이메일, **Table Editor → profiles**에는 같은 회원의 아이디가 생깁니다.
2. 메뉴를 담고 현장 결제로 주문하세요. 장바구니가 비고 내 주문 상세에 수량·단가·합계가 표시되어야 합니다.
3. 구매한 메뉴에 사진과 리뷰를 올리세요. 로그아웃한 뒤 리뷰 목록에서 사진과 끝 두 글자가 가려진 작성자 아이디를 확인하세요. 다른 계정으로 로그인하면 첫 계정의 주문은 조회할 수 없습니다.

무료 프로젝트는 일정 기간 사용하지 않으면 일시정지될 수 있습니다. 발표 전에 대시보드의 프로젝트 상태를 보고, 일시정지 상태라면 **Restore project**로 복구한 뒤 로그인과 리뷰 조회를 확인하세요.

## 개발자가 로컬에서 검증하기

저장소 루트에서 `npm test`를 실행하면 앱 테스트와 SQL 정책 테스트가 함께 실행됩니다. SQL 사례별 결과만 확인하려면 아래 명령으로 설치된 Vitest를 실행하세요.

```sh
npm exec --offline -- vitest run --config supabase/tests/vitest.config.ts
```

`merge_cart(p_items)`는 SQL 열 이름으로 구성한 JSON 배열을 받습니다. 예를 들어 `[{"menu_id":"cookie","temperature":"","quantity":2}]`는 쿠키 두 개를 합칩니다. 잘못된 항목이 있으면 배열 전체가 취소됩니다.
