-- Supabase SQL Editor에서 파일 전체를 실행하세요. 중간에 실패하면 모두 되돌립니다.
begin;

-- Supabase가 public 스키마에 미리 준 브라우저 역할의 기본 권한을 거둡니다.
-- 함수의 PostgreSQL 기본 PUBLIC 실행 권한은 아래에서 각 함수별로 거둡니다.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- 회원의 표시용 대소문자와 중복 검사용 소문자 키를 함께 보관합니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text not null check (login_id collate "C" ~ '^[A-Za-z0-9]{4,20}$'),
  login_key text not null unique check (login_key = lower(login_id collate "C"))
);

-- 메뉴의 빈 온도 배열은 디저트를 뜻합니다. 가격 단위는 원입니다.
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  temperatures text[] not null check (temperatures <@ array['hot', 'ice']::text[])
);
create table if not exists public.cart_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  menu_id text not null references public.menu_items(id),
  temperature text not null check (temperature in ('', 'hot', 'ice')),
  quantity integer not null check (quantity between 1 and 20),
  primary key (user_id, menu_id, temperature)
);

-- 날짜는 한국 시간, 뒷자리는 충돌 없이 증가하는 주문 번호입니다.
create sequence if not exists public.order_no_seq start with 100000;
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default (
    to_char(statement_timestamp() at time zone 'Asia/Seoul', 'YYYYMMDD')
    || '-' || nextval('public.order_no_seq'::regclass)::text
  ),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total integer not null check (total >= 0),
  receive_method text not null check (receive_method in ('takeout', 'dine-in')),
  payment_method text not null check (payment_method in ('onsite', 'online')),
  payment_status text not null check (
    (payment_method = 'onsite' and payment_status = 'onsite-due') or
    (payment_method = 'online' and payment_status = 'mock-paid')
  ),
  created_at timestamptz not null default now()
);
-- 주문 당시의 상품명·가격을 복사해 이후 메뉴 변경과 관계없이 영수증을 보존합니다.
create table if not exists public.order_lines (
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_id text not null references public.menu_items(id),
  name text not null,
  temperature text not null check (temperature in ('', 'hot', 'ice')),
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  primary key (order_id, menu_id, temperature)
);

-- 같은 주문에서 같은 메뉴를 다른 온도로 사도 리뷰는 하나만 작성할 수 있습니다.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_id text not null references public.menu_items(id),
  rating integer not null check (rating between 1 and 5),
  -- 앞뒤 공백·줄바꿈 등 브라우저의 trim 대상 문자를 제외하고 글자 수를 셉니다.
  body text not null check (char_length(btrim(body,
    U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  )) between 1 and 500),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (order_id, menu_id)
);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc, id);
create index if not exists reviews_created_idx on public.reviews(created_at desc, id);
create index if not exists reviews_user_created_idx on public.reviews(user_id, created_at desc, id);
create index if not exists reviews_menu_created_idx on public.reviews(menu_id, created_at desc, id);

-- 브라우저가 보낸 표시 아이디는 인증 이메일의 키와 일치할 때만 채택합니다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text := split_part(new.email, '@', 1);
  v_display text := new.raw_user_meta_data->>'login_id';
begin
  if v_key is null or v_key collate "C" !~ '^[a-z0-9]{4,20}$'
     or new.email <> v_key || '@id.cafewebsite-livid.vercel.app' then
    raise exception 'login-id-invalid';
  end if;
  insert into public.profiles(id, login_id, login_key)
    values (new.id, case when lower(v_display collate "C") = v_key then v_display else v_key end, v_key);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists cafe_handle_new_user on auth.users;
create trigger cafe_handle_new_user after insert on auth.users
  for each row execute function public.handle_new_user();

-- 수정 시각은 DB가 기록합니다. 작성만 한 리뷰의 수정 시각은 비어 있습니다.
create or replace function public.touch_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke execute on function public.touch_review() from public, anon, authenticated;
drop trigger if exists cafe_touch_review on public.reviews;
create trigger cafe_touch_review before update on public.reviews
  for each row execute function public.touch_review();

-- 모든 앱 테이블에 행 보안을 켜고, 브라우저에는 작업별·열별 권한만 줍니다.
alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.reviews enable row level security;

revoke all on public.profiles, public.menu_items, public.cart_items, public.orders,
  public.order_lines, public.reviews from public, anon, authenticated;
revoke all on sequence public.order_no_seq from public, anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant select on public.profiles, public.cart_items, public.orders, public.order_lines,
  public.reviews to authenticated;
grant delete on public.cart_items, public.reviews to authenticated;
grant insert (user_id, order_id, menu_id, rating, body, photo_path),
      update (rating, body, photo_path) on public.reviews to authenticated;

-- 메뉴는 공개하고, 장바구니와 주문 내역은 로그인한 소유자에게만 보입니다.
drop policy if exists menu_read on public.menu_items;
create policy menu_read on public.menu_items for select to anon, authenticated using (true);
drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists cart_read on public.cart_items;
create policy cart_read on public.cart_items for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists cart_delete on public.cart_items;
create policy cart_delete on public.cart_items for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists order_read on public.orders;
create policy order_read on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists line_read on public.order_lines;
create policy line_read on public.order_lines for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_lines.order_id and o.user_id = (select auth.uid()))
);

-- 원본 리뷰는 작성자만 다룹니다. 주문과 메뉴가 같은 구매 명세까지 확인합니다.
drop policy if exists review_read on public.reviews;
create policy review_read on public.reviews for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists review_insert on public.reviews;
create policy review_insert on public.reviews for insert to authenticated with check (
  user_id = (select auth.uid()) and
  (photo_path is null or starts_with(photo_path, (select auth.uid())::text || '/')) and
  exists (
    select 1 from public.order_lines l join public.orders o on o.id = l.order_id
    where l.order_id = reviews.order_id and l.menu_id = reviews.menu_id and o.user_id = (select auth.uid())
  )
);
drop policy if exists review_update on public.reviews;
create policy review_update on public.reviews for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and
              (photo_path is null or starts_with(photo_path, (select auth.uid())::text || '/')));
drop policy if exists review_delete on public.reviews;
create policy review_delete on public.reviews for delete to authenticated using (user_id = (select auth.uid()));

-- 메뉴 시드를 갱신하면 담을 때와 주문할 때의 제공 온도가 다를 수 있어 양쪽에서 검사합니다.
create or replace function public.checked_temperature(p_temperature text, p_options text[]) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_options is null then raise exception 'menu-unknown'; end if;
  if p_temperature is null or not (
    (cardinality(p_options) = 0 and p_temperature = '') or p_temperature = any(p_options)
  ) then raise exception 'temperature-invalid'; end if;
  return p_temperature;
end;
$$;
revoke execute on function public.checked_temperature(text, text[]) from public, anon, authenticated;

-- 담기·수정·합치기가 같은 수량 및 메뉴별 온도 규칙을 사용합니다.
create or replace function public.check_cart_item(p_menu_id text, p_temperature text, p_quantity integer)
returns void language plpgsql set search_path = '' as $$
declare
  v_temperatures text[];
begin
  if auth.uid() is null then raise exception 'not-authenticated'; end if;
  if p_quantity is null or p_quantity not between 1 and 20 then raise exception 'quantity-invalid'; end if;
  select m.temperatures into v_temperatures from public.menu_items m where m.id = p_menu_id;
  perform public.checked_temperature(p_temperature, v_temperatures);
end;
$$;
revoke execute on function public.check_cart_item(text, text, integer) from public, anon, authenticated;

-- 같은 메뉴·온도의 동시 추가도 기존 수량에 합산하고 20개에서 멈춥니다.
create or replace function public.add_cart_item(p_menu_id text, p_temperature text, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_cart_item(p_menu_id, p_temperature, p_quantity);
  insert into public.cart_items as c (user_id, menu_id, temperature, quantity)
    values (auth.uid(), p_menu_id, p_temperature, p_quantity)
    on conflict (user_id, menu_id, temperature) do update set quantity = least(20, c.quantity + excluded.quantity);
end;
$$;
revoke execute on function public.add_cart_item(text, text, integer) from public, anon, authenticated;
grant execute on function public.add_cart_item(text, text, integer) to authenticated;

-- 수량 변경은 현재 회원의 기존 행에만 적용합니다.
create or replace function public.set_cart_quantity(p_menu_id text, p_temperature text, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_cart_item(p_menu_id, p_temperature, p_quantity);
  update public.cart_items set quantity = p_quantity
    where user_id = auth.uid() and menu_id = p_menu_id and temperature = p_temperature;
  if not found then raise exception 'not-found'; end if;
end;
$$;
revoke execute on function public.set_cart_quantity(text, text, integer) from public, anon, authenticated;
grant execute on function public.set_cart_quantity(text, text, integer) to authenticated;

-- 손님 장바구니는 배열 전체가 유효해야 반영됩니다. 누락·형식 오류·추가 필드는 거절합니다.
create or replace function public.merge_cart(p_items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_qty numeric;
begin
  if auth.uid() is null then raise exception 'not-authenticated'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'quantity-invalid'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'quantity-invalid'; end if;
    if jsonb_typeof(v_item->'menu_id') is distinct from 'string' then raise exception 'menu-unknown'; end if;
    if jsonb_typeof(v_item->'temperature') is distinct from 'string' then raise exception 'temperature-invalid'; end if;
    if jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or (v_item - array['menu_id','temperature','quantity']) <> '{}'::jsonb then
      raise exception 'quantity-invalid';
    end if;
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty <> trunc(v_qty) or v_qty not between 1 and 20 then raise exception 'quantity-invalid'; end if;
    perform public.add_cart_item(v_item->>'menu_id', v_item->>'temperature', v_qty::integer);
  end loop;
end;
$$;
revoke execute on function public.merge_cart(jsonb) from public, anon, authenticated;
grant execute on function public.merge_cart(jsonb) to authenticated;

-- 한 SQL 문에서 잠근 행만 가격 계산·명세 저장·삭제에 사용합니다.
-- 대기 중 다른 결제가 먼저 소비한 행은 제외되고, 나중에 담긴 행은 카트에 남습니다.
create or replace function public.place_order(p_receive_method text, p_payment_method text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'not-authenticated'; end if;
  if p_receive_method is null or p_receive_method not in ('takeout', 'dine-in') or
     p_payment_method is null or p_payment_method not in ('onsite', 'online') then
    raise exception 'method-invalid';
  end if;

  with cart as materialized (
    select c.menu_id, public.checked_temperature(c.temperature, m.temperatures) as temperature,
           c.quantity, m.name, m.price
    from public.cart_items c join public.menu_items m on m.id = c.menu_id
    where c.user_id = v_user order by c.menu_id, c.temperature for update of c
  ), saved as (
    insert into public.orders(user_id, total, receive_method, payment_method, payment_status)
    select v_user, sum(price * quantity), p_receive_method, p_payment_method,
           case p_payment_method when 'onsite' then 'onsite-due' else 'mock-paid' end
    from cart having count(*) > 0 returning id
  ), lines as (
    insert into public.order_lines(order_id, menu_id, name, temperature, unit_price, quantity)
    select s.id, c.menu_id, c.name, c.temperature, c.price, c.quantity from saved s cross join cart c
  ), cleared as (
    delete from public.cart_items c using cart
    where c.user_id = v_user and c.menu_id = cart.menu_id and c.temperature = cart.temperature
  )
  select id into v_id from saved;
  if v_id is null then raise exception 'cart-empty'; end if;
  return v_id;
end;
$$;
revoke execute on function public.place_order(text, text) from public, anon, authenticated;
grant execute on function public.place_order(text, text) to authenticated;

-- 공개 목록은 표시 아이디의 끝 두 글자를 가리고, 작성자에게만 주문 ID를 돌려줍니다.
create or replace function public.list_reviews(p_menu_id text, p_mine boolean, p_sort text)
returns table (id uuid, order_id uuid, menu_id text, rating integer, body text, photo_path text,
               author_masked text, is_mine boolean, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, case when r.user_id = viewer.id then r.order_id end, r.menu_id, r.rating, r.body, r.photo_path,
         left(p.login_id, -2) || '**', r.user_id is not distinct from viewer.id, r.created_at, r.updated_at
  from public.reviews r join public.profiles p on p.id = r.user_id
  cross join (select auth.uid() as id) viewer
  where (p_menu_id is null or r.menu_id = p_menu_id) and
        (not coalesce(p_mine, false) or r.user_id = viewer.id)
  order by case when p_sort = 'rating-high' then r.rating end desc,
           case when p_sort = 'rating-low' then r.rating end asc,
           r.created_at desc, r.id asc;
$$;
revoke execute on function public.list_reviews(text, boolean, text) from public, anon, authenticated;
grant execute on function public.list_reviews(text, boolean, text) to anon, authenticated;

-- 사진 URL은 공개합니다. 파일 목록·새 업로드·삭제는 이 버킷 안의 본인 폴더로 제한합니다.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('review-photos', 'review-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists cafe_photo_read on storage.objects;
create policy cafe_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists cafe_photo_insert on storage.objects;
create policy cafe_photo_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists cafe_photo_delete on storage.objects;
create policy cafe_photo_delete on storage.objects for delete to authenticated using (
  bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 프런트엔드 src/data/menu.ts의 메뉴명·가격·온도를 기준으로 시드를 갱신합니다.
insert into public.menu_items(id, name, price, temperatures) values
  ('espresso', '에스프레소', 4000, array['hot']::text[]),
  ('americano', '아메리카노', 4800, array['hot', 'ice']::text[]),
  ('cafe-latte', '카페라떼', 5300, array['hot', 'ice']::text[]),
  ('cappuccino', '카푸치노', 5300, array['hot']::text[]),
  ('vanilla-latte', '바닐라라떼', 5800, array['hot', 'ice']::text[]),
  ('caramel-macchiato', '카라멜 마키아토', 6000, array['hot', 'ice']::text[]),
  ('cafe-mocha', '카페모카', 6000, array['hot', 'ice']::text[]),
  ('cold-brew', '콜드브루', 5500, array['ice']::text[]),
  ('chocolate-latte', '초코라떼', 5800, array['hot', 'ice']::text[]),
  ('matcha-latte', '말차라떼', 6000, array['hot', 'ice']::text[]),
  ('sweet-potato-latte', '고구마라떼', 6000, array['hot', 'ice']::text[]),
  ('milk-tea', '밀크티', 6000, array['hot', 'ice']::text[]),
  ('lemonade', '레몬에이드', 6000, array['ice']::text[]),
  ('grapefruit-ade', '자몽에이드', 6500, array['ice']::text[]),
  ('earl-grey', '얼그레이', 5000, array['hot', 'ice']::text[]),
  ('chamomile', '캐모마일', 5000, array['hot']::text[]),
  ('peppermint', '페퍼민트', 5000, array['hot', 'ice']::text[]),
  ('yuja-tea', '유자차', 5500, array['hot', 'ice']::text[]),
  ('croissant', '크루아상', 4500, array[]::text[]),
  ('financier', '휘낭시에', 3500, array[]::text[]),
  ('scone', '스콘', 4000, array[]::text[]),
  ('cheesecake', '치즈케이크', 7000, array[]::text[]),
  ('cookie', '쿠키', 3500, array[]::text[])
on conflict (id) do update set name = excluded.name, price = excluded.price, temperatures = excluded.temperatures;

commit;
