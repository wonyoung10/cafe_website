# 13. 회원·구매·리뷰 기능 기획

2026-11-25 사용자 요청으로 범위를 넓힌다. 기존 제외 항목(로그인·주문·결제, DB)을 대체하는 결정은 [ADR-008](decisions/ADR-008-commerce-scope.md).

## 1. 요구사항

표시: **U** = 사용자가 직접 말한 것 · **D** = 총괄이 정한 기본값(사용자 확인 대상)

### 회원 (AU)
| ID | 출처 | 요구사항 | 검증 |
|---|---|---|---|
| AU-01 | U | 회원가입 `/signup`, 로그인 `/login`, 로그아웃 | 단위·E2E |
| AU-02 | U | 아이디는 4자 이상 | 3자 거부, 4자 허용 |
| AU-03 | U | 비밀번호는 영어와 숫자로만 | `abc!12`, `비밀번호1`, 공백 거부 |
| AU-04 | D | 아이디는 영어·숫자 4~20자, 대소문자만 다르면 같은 아이디(내부 이메일로 바꿔 쓰기 때문) | 단위·SQL |
| AU-05 | D | 비밀번호는 6자 이상(Supabase 최소 길이). 영어만, 숫자만도 허용. 비밀번호 확인 칸 일치 | 단위 |
| AU-06 | D | 새로고침해도 로그인 유지 | E2E |
| AU-07 | D | 비밀번호는 Supabase Auth가 해시로 저장한다. 가입 화면에 다른 곳에서 쓰는 비밀번호를 넣지 말라는 안내를 둔다 | 단위 |

### 장바구니·구매 (SH)
| ID | 출처 | 요구사항 | 검증 |
|---|---|---|---|
| SH-01 | U | 메뉴에서 장바구니 담기(HOT/ICE가 둘 다 있으면 선택) | 단위·E2E |
| SH-02 | U | 장바구니 `/cart`: 수량 변경, 삭제, 합계. 헤더에 담은 수량 표시 | 단위·E2E |
| SH-03 | D | 로그인 전에도 담을 수 있고, 로그인하면 내 장바구니와 합친다. 결제는 로그인 필요 | E2E |
| SH-04 | U | 결제 `/checkout`: 테이크아웃 / 매장 선택. 화면에는 영어로 Take Out / Take In으로 표시(2026-11-25 요청) | E2E 4조합 |
| SH-05 | U | 테이크아웃과 매장 각각 현장 결제 / 온라인 결제 선택 | E2E 4조합 |
| SH-06 | U | 실제 결제는 하지 않는다. 온라인 결제는 모의 결제 창에서 승인/취소만. 카드 번호 등 결제 정보를 받지 않는다 | 결제 관련 외부 요청 없음 |
| SH-07 | D | 취소하면 주문을 만들지 않고 장바구니를 유지한다. 승인하면 주문 저장과 장바구니 비우기를 한 트랜잭션으로 처리한다 | SQL·E2E |
| SH-08 | D | 주문 내역 `/orders`, 상세 `/orders/:orderId`. 남의 주문은 볼 수 없다 | SQL·E2E |

### 리뷰 (RV)
| ID | 출처 | 요구사항 | 검증 |
|---|---|---|---|
| RV-01 | U | 구매한 상품에만 리뷰를 쓸 수 있다 | SQL: 구매하지 않은 메뉴 거부 |
| RV-02 | U | 모든 리뷰를 보는 페이지 `/reviews` (로그인 없이 볼 수 있음) | E2E |
| RV-03 | U | 별점(1~5)과 리뷰 글은 필수, 사진은 선택 | 단위·E2E |
| RV-04 | U | 내가 쓴 리뷰만 수정·삭제 버튼이 보이고 동작한다. DB 규칙(RLS)으로도 막는다 | SQL: 다른 사용자 거부 |
| RV-05 | U | 리뷰의 아이디는 끝 2글자를 `*`로 가린다 (`coffee12` → `coffee**`). 가리기는 DB에서 하고 원본 아이디는 브라우저로 보내지 않는다 | SQL·E2E |
| RV-06 | D | 주문 1건의 메뉴 1종마다 리뷰 1개 | SQL: 중복 거부 |
| RV-07 | D | 글은 앞뒤 공백을 뺀 1~500자. 사진은 1장(JPG·PNG·WebP, 10MB 이하)을 긴 변 1200px로 줄여 올린다 | 단위 |
| RV-08 | D | 메뉴별 보기, 내 리뷰만 보기, 최신순·별점순 정렬, 평균 별점 | 단위·E2E |
| RV-09 | D | 삭제 전 확인 단계. 지어낸 예시 리뷰는 넣지 않고 빈 상태를 안내한다 | E2E |

## 2. DB: Supabase (2026-11-25 사용자 결정)

처음에는 브라우저 DB로 정했으나 다른 사람과 리뷰를 공유하기 위해 Supabase(Postgres + Auth + Storage)로 바꿨다. 브라우저는 **공개 키(publishable/anon)만** 쓴다. `service_role`(secret) 키는 저장소와 Vercel 어디에도 넣지 않는다.

| 테이블 | 주요 열 | 브라우저 권한(RLS) |
|---|---|---|
| `profiles` | `id`→auth.users, `login_id`, `login_key`(소문자, unique) | 본인 행 조회만. 생성은 `auth.users` 트리거 |
| `menu_items` | `id`, `name`, `price`, `temperatures text[]` | 누구나 조회, 쓰기 불가. `src/data/menu.ts`와 같은 값을 시드 |
| `cart_items` | `user_id, menu_id, temperature('' 허용), quantity 1..20` PK(user, menu, temp) | 본인 행 조회·삭제. 추가·변경은 RPC |
| `orders` | `id, order_no, user_id, total, receive_method, payment_method, payment_status, created_at` | 본인 행 조회만. 생성은 `place_order` RPC |
| `order_lines` | `order_id, menu_id, name, temperature, unit_price, quantity` | 본인 주문의 행 조회만 |
| `reviews` | `id, user_id, order_id, menu_id, rating 1..5, body 1..500자, photo_path, created_at, updated_at`, unique(order_id, menu_id) | 본인 행만 조회·수정·삭제, 본인이 산 메뉴만 추가. 수정 가능 열은 `rating, body, photo_path`뿐 |

RPC (모두 `security definer`, `set search_path = ''`, 실행 권한은 필요한 역할에만)

| 함수 | 역할 | 동작 |
|---|---|---|
| `add_cart_item(p_menu_id text, p_temperature text, p_quantity int)` | authenticated | 같은 메뉴·온도면 더하고 20에서 멈춤 |
| `set_cart_quantity(p_menu_id text, p_temperature text, p_quantity int)` | authenticated | 1..20 |
| `merge_cart(p_items jsonb)` | authenticated | 비로그인 장바구니 합치기. 한 트랜잭션 |
| `place_order(p_receive_method text, p_payment_method text) returns uuid` | authenticated | 가격을 `menu_items`에서 읽어 주문 생성, 장바구니 비우기. 한 트랜잭션, 중복 실행 방지(장바구니 행 잠금) |
| `list_reviews(p_menu_id text, p_mine boolean, p_sort text)` | anon, authenticated | 가린 아이디(`author_masked`)와 `is_mine`만 반환. `user_id`·원본 아이디는 반환하지 않음. `order_id`는 내 리뷰일 때만 |

오류는 `raise exception '<code>'`로 던진다: `cart-empty` `quantity-invalid` `menu-unknown` `temperature-invalid` `method-invalid` `not-authenticated`.

- **아이디 로그인:** 이메일 `<소문자 아이디>@id.cafewebsite-livid.vercel.app`으로 바꿔 Supabase Auth 비밀번호 로그인을 쓴다. 메일은 보내지 않는다(Confirm email 끔). 트리거가 이메일 형식과 아이디 규칙을 다시 검사한다.
- **사진:** 공개 버킷 `review-photos`(2MB, jpeg·png·webp). 경로 `<auth.uid()>/<uuid>.<확장자>`. 본인 폴더에만 올리고 지울 수 있다. 목록 조회는 본인 폴더만.
- **환경 변수:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.local`, Vercel). 없으면 기존 소개 페이지는 그대로 동작하고 회원·구매·리뷰 화면은 준비 안내를 보여 준다.
- **검증:** Docker 없이 PGlite(WASM Postgres)에 같은 SQL을 실행해 스키마·RLS·RPC를 테스트한다. `auth`·`storage` 스키마는 테스트에서 최소로 흉내 낸다. 실제 Supabase Auth·Storage 연동은 사용자 프로젝트가 준비된 뒤 확인한다.

## 3. 브랜치 간 계약

```ts
// src/types/commerce.ts
export interface SessionUser { id: string; loginId: string }
export interface CartItem { menuId: string; temperature: Temperature | null; quantity: number } // 1..20
export type ReceiveMethod = 'takeout' | 'dine-in';
export type PaymentMethod = 'onsite' | 'online';
export type PaymentStatus = 'onsite-due' | 'mock-paid';
export interface OrderLine { menuId: string; name: string; temperature: Temperature | null; unitPrice: number; quantity: number }
export interface Order { id: string; orderNo: string; lines: OrderLine[]; total: number;
  receiveMethod: ReceiveMethod; paymentMethod: PaymentMethod; paymentStatus: PaymentStatus; createdAt: string }
export interface ReviewInput { rating: number; text: string }
/** keep = 그대로, remove = 삭제, Blob = 새 사진 */
export type PhotoChange = 'keep' | 'remove' | Blob;
export type ReviewSort = 'latest' | 'rating-high' | 'rating-low';
/** orderId는 내 리뷰일 때만 값이 있다 */
export interface ReviewView extends ReviewInput { id: string; orderId: string | null; menuId: string;
  photoUrl: string | null; authorMasked: string; isMine: boolean; createdAt: string; updatedAt: string | null }

// src/services/commerceApi.ts
export interface CommerceApi {
  auth: { getSession(): Promise<SessionUser | null>; onChange(cb: (u: SessionUser | null) => void): () => void;
    signUp(loginId: string, password: string): Promise<SessionUser>;
    logIn(loginId: string, password: string): Promise<SessionUser>; logOut(): Promise<void> };
  cart: { list(): Promise<CartItem[]>; add(item: CartItem): Promise<void>; setQuantity(item: CartItem): Promise<void>;
    remove(menuId: string, temperature: Temperature | null): Promise<void>; merge(items: CartItem[]): Promise<void> };
  orders: { place(r: ReceiveMethod, p: PaymentMethod): Promise<string>; list(): Promise<Order[]>; get(id: string): Promise<Order | null> };
  reviews: { list(q: { menuId?: string; mineOnly?: boolean; sort?: ReviewSort }): Promise<ReviewView[]>;
    create(p: { orderId: string; menuId: string } & ReviewInput, photo: Blob | null): Promise<string>;
    update(id: string, input: ReviewInput, photo: PhotoChange): Promise<void>; remove(id: string): Promise<void> };
}
// src/services/errors.ts   class CommerceError extends Error { code: CommerceErrorCode }
// src/services/supabaseApi.ts (운영, supabase-js는 동적 import)
// src/services/memoryApi.ts  (단위 테스트·E2E·키 없는 화면 확인용, localStorage 보관)
// VITE_COMMERCE_BACKEND=memory 일 때만 memoryApi를 쓴다. 운영 빌드 기본값은 supabase.

// src/utils/credentials.ts  validateLoginId(v), validatePassword(v): string | null   (오류 문구 또는 null)
// src/utils/mask.ts         maskLoginId(v): 끝 2글자 → '**' (memoryApi 전용, 운영은 DB가 가림)
// src/utils/nextPath.ts     safeNextPath(v): 내부 경로만, 그 외 '/'
// src/contexts/  useCommerce(): { configured: boolean; api: CommerceApi }
//                useAuth(): { status: 'loading'|'guest'|'member', user, signUp, logIn, logOut }
//                useCart(): { status, items, count, total, add, setQuantity, remove, reload }
// src/components/auth/RequireAuth.tsx — 비로그인 시 /login?next=
// 자리표시: src/components/auth/AccountMenu.tsx(A13) · src/components/cart/CartButton.tsx, AddToCart.tsx(A14)
```

## 4. 경로

| 경로 | 화면 | 로그인 |
|---|---|---|
| `/signup` `/login` | 회원가입, 로그인 | |
| `/cart` | 장바구니 | |
| `/checkout` | 결제(모의) | 필요 |
| `/orders` `/orders/:orderId` | 주문 내역, 주문 상세(완료 화면 겸용) | 필요 |
| `/reviews` | 리뷰 모아보기 (`?menu=`, `?mine=1`, `?sort=`) | |
| `/reviews/new?order=&menu=` `/reviews/:reviewId/edit` | 리뷰 쓰기, 수정 | 필요 |

헤더 메뉴는 메뉴소개·매장·오시는 길 뒤에 **리뷰**를 더하고, 오른쪽에 장바구니와 로그인/내 계정을 둔다. 새 페이지는 모두 `React.lazy`.

## 5. 에이전트 구성

| ID | 페르소나 | 실행·모델 | 브랜치 |
|---|---|---|---|
| A10 | PM 겸 아키텍트: 계약 정의, 리뷰, 커밋, 사용자 확인 | Claude Code · Claude Opus 5.5 (메인 세션) | `docs/commerce-planning` |
| A11 | Postgres·RLS 보안 엔지니어 | Codex CLI · `gpt-6.2-astra` (high) | `feature/supabase-schema` |
| A12 | 프론트엔드 플랫폼 엔지니어(서비스·상태·라우팅) | Codex CLI · `gpt-6.2-astra` (high) | `feature/commerce-core` |
| A13 | 폼 접근성에 강한 인증 UI 개발자 | Codex CLI · `gpt-6.2-astra` (high) | `feature/auth` |
| A14 | 커머스 흐름 전문 프론트엔드 개발자 | Codex CLI · `gpt-6.2-astra` (high) | `feature/cart-checkout` |
| A15 | 콘텐츠 중심 UI 디자이너 겸 개발자 | Claude 하위 에이전트 · Opus | `feature/reviews` |
| A16 | 실패 경로를 먼저 찾는 QA 엔지니어 | Claude 하위 에이전트 · Sonnet | `test/commerce-qa` |

- **Codex에 맡기는 이유(A11~A14):** 입출력 계약이 분명하고 테스트로 판정할 수 있는 구현.
- **Claude에 맡기는 이유(A15, A16):** A15는 기존 디자인 문법을 읽고 새 화면의 톤을 정해야 한다. A16은 포트를 열고 브라우저를 띄워야 하는데 Codex 샌드박스는 포트 바인딩이 막혀 있다.
- 각 에이전트 프롬프트 원문은 `docs/agent-prompts/`에 보관한다(Persona·Goal·Context·Task·Model·Tools·Harness·Git Branch·File Scope·Deliverables·Acceptance).

## 6. 브랜치와 병합

```text
main
└─ docs/commerce-planning
   └─ feature/supabase-schema
      └─ feature/commerce-core
         └─ feature/auth
            └─ feature/cart-checkout
               └─ feature/reviews
                  └─ test/commerce-qa
```

- schema와 core, 이어서 auth·cart·reviews를 나란히 개발한 뒤 커밋할 때 위 순서로 쌓는다.
- **`main` 병합은 사용자가 확인하고 승인한 뒤에만** 순서대로 `--no-ff`로 한다. 푸시는 별도 요청이 있을 때만.
