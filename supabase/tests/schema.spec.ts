// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { MENU_ITEMS } from '../../src/data/menu';

const a = '00000000-0000-4000-8000-00000000000a';
const b = '00000000-0000-4000-8000-00000000000b';
const domain = 'id.cafewebsite-livid.vercel.app';
const db = new PGlite();
const add = 'select public.add_cart_item($1,$2,$3)';
const setQuantity = 'select public.set_cart_quantity($1,$2,$3)';
const merge = 'select public.merge_cart($1::jsonb)';
const place = 'select public.place_order($1,$2) as id';
const list = 'select * from public.list_reviews($1,$2,$3)';
const insertReview = `insert into public.reviews(user_id, order_id, menu_id, rating, body, photo_path)
  values ($1,$2,$3,$4,$5,$6) returning id`;
const cartRow = { menu_id: 'americano', temperature: 'hot', quantity: 3 };

function asRole<T = Record<string, unknown>>(
  role: 'anon' | 'authenticated', user: string | null, sql: string, params: unknown[] = [],
) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user })]);
    await tx.exec(`set local role ${role}`);
    return tx.query<T>(sql, params);
  });
}
function member<T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) {
  return asRole<T>('authenticated', user, sql, params);
}
function guest(sql: string, params: unknown[] = []) {
  return asRole('anon', null, sql, params);
}
function signup(email: string | null, display?: string, id?: string) {
  return db.query('insert into auth.users(id,email,raw_user_meta_data) values (coalesce($1,gen_random_uuid()),$2,$3)',
    [id ?? null, email, JSON.stringify({ login_id: display })]);
}
async function purchase(user: string, menu = 'espresso', temp = 'hot') {
  await member(user, add, [menu, temp, 1]);
  const result = await member<{ id: string }>(user, place, ['takeout', 'onsite']);
  return result.rows[0]!.id;
}
function review(user: string, order: string, menu = 'espresso', rating = 4, body = '맛있어요', photo: string | null = null) {
  return member<{ id: string }>(user, insertReview, [user, order, menu, rating, body, photo]);
}

beforeAll(async () => {
  const [bootstrap, schema] = await Promise.all(['./bootstrap.sql', '../schema.sql'].map(path =>
    readFile(new URL(path, import.meta.url), 'utf8')));
  await db.exec(bootstrap!);
  await db.exec(schema!);
  await signup('keep123@' + domain, 'Keep123', a);
  await member(a, add, ['cookie', '', 1]);
  await db.exec("update public.menu_items set price = 1 where id = 'cookie'");
  await db.exec(schema!);
  expect((await member(a, 'select quantity from public.cart_items')).rows).toEqual([{ quantity: 1 }]);
  expect((await member(a, 'select login_id from public.profiles')).rows).toEqual([{ login_id: 'Keep123' }]);
});
beforeEach(async () => {
  await db.exec('truncate auth.users cascade; truncate storage.objects');
  await signup('coffee12@' + domain, 'Coffee12', a);
  await signup('latte987@' + domain, 'latte987', b);
});
afterAll(() => db.close());

describe('스키마와 가입', () => {
  test('재실행한 시드의 모든 행·온도·이름·가격이 MENU_ITEMS와 일치한다', async () => {
    const expected = MENU_ITEMS.map(({ id, name, price, temperatures }) => ({ id, name, price, temperatures }))
      .sort((x, y) => x.id.localeCompare(y.id, 'en'));
    expect((await guest('select * from public.menu_items order by id collate "C"')).rows).toEqual(expected);
  });
  test('모든 앱 테이블에 RLS가 켜져 있다', async () => {
    const result = await db.query(`select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`);
    expect(result.rows).toEqual(['cart_items', 'menu_items', 'order_lines', 'orders', 'profiles', 'reviews']
      .map(relname => ({ relname, relrowsecurity: true })));
  });
  test('RPC 실행 권한과 고정 search_path를 검사한다', async () => {
    const result = await db.query(`select proname, prosecdef, proconfig,
        has_function_privilege('anon', p.oid, 'execute') as guest,
        has_function_privilege('authenticated', p.oid, 'execute') as member,
        exists (select from aclexplode(p.proacl) where grantee=0 and privilege_type='EXECUTE') as public_exec
      from pg_proc p where pronamespace = 'public'::regnamespace order by proname`);
    const callable = ['add_cart_item', 'list_reviews', 'merge_cart', 'place_order', 'set_cart_quantity'];
    expect(result.rows).toEqual([...callable, 'check_cart_item', 'checked_temperature', 'handle_new_user', 'touch_review'].sort()
      .map(proname => ({
        proname, prosecdef: callable.includes(proname) || proname === 'handle_new_user',
        proconfig: ['search_path=""'], guest: proname === 'list_reviews', member: callable.includes(proname),
        public_exec: false,
      })));
  });
  test.each(['abc', 'ab!c', 'a'.repeat(21), 'UPPER'])('잘못된 가입 키 %s', async key => {
    await expect(signup(key + '@' + domain)).rejects.toThrow('login-id-invalid');
  });
  test.each(['abcd@else.example', 'abcd@' + domain + '@else.example', null])('잘못된 이메일 %s', async email => {
    await expect(signup(email)).rejects.toThrow('login-id-invalid');
  });
  test('같은 키는 대소문자 표시가 달라도 가입이 취소된다', async () => {
    await expect(signup('coffee12@' + domain, 'COFFEE12')).rejects.toMatchObject({ code: '23505' });
    expect((await db.query('select id from auth.users')).rows).toHaveLength(2);
  });
  test('가입 경계 길이와 표시 아이디 대체 및 본인 프로필 조회', async () => {
    await signup('abcd@' + domain, 'another');
    const longest = 'x'.repeat(20);
    await signup(longest + '@' + domain);
    expect((await db.query("select login_id from public.profiles where id not in ($1,$2) order by login_id", [a,b])).rows)
      .toEqual([{ login_id: 'abcd' }, { login_id: longest }]);
    expect((await member(a, 'select * from public.profiles')).rows)
      .toEqual([{ id: a, login_id: 'Coffee12', login_key: 'coffee12' }]);
  });
});

describe('브라우저 권한', () => {
  test.each(['profiles','cart_items','orders','order_lines','reviews'])('비회원은 %s를 직접 읽을 수 없다', async table => {
    await expect(guest(`select * from public.${table}`)).rejects.toMatchObject({ code: '42501' });
  });
  test.each(['orders','order_lines','cart_items','menu_items','profiles'])('%s 직접 추가 거부', async table => {
    await expect(member(a, `insert into public.${table} default values`)).rejects.toMatchObject({ code: '42501' });
  });
  test.each([
    [add, ['espresso','hot',1]], [setQuantity, ['espresso','hot',1]], [merge, ['[]']], [place, ['takeout','online']],
  ] as const)('인증이 필요한 RPC %s', async (sql, params) => {
    await expect(guest(sql, [...params])).rejects.toMatchObject({ code: '42501' });
    await expect(asRole('authenticated', null, sql, [...params])).rejects.toThrow('not-authenticated');
  });
  test('다른 회원의 장바구니·주문·명세·리뷰를 읽거나 수정·삭제할 수 없다', async () => {
    const order = await purchase(b);
    await review(b, order);
    await member(b, add, ['espresso','hot',3]);
    for (const table of ['cart_items','orders','order_lines','reviews']) {
      expect((await member(a, `select * from public.${table}`)).rows).toEqual([]);
      expect((await member(b, `select * from public.${table}`)).rows).toHaveLength(1);
    }
    for (const statement of ['update cart_items set quantity=2', 'update orders set total=1',
      'delete from orders', 'update order_lines set unit_price=1', 'delete from order_lines']) {
      await expect(member(a, statement)).rejects.toMatchObject({ code: '42501' });
    }
    for (const statement of ['delete from cart_items', 'update reviews set rating=1', 'delete from reviews']) {
      expect((await member(a, statement + ' returning *')).rows).toEqual([]);
    }
    await expect(member(a, setQuantity, ['espresso','hot',2])).rejects.toThrow('not-found');
    expect((await member(b, 'select quantity from cart_items')).rows).toEqual([{ quantity: 3 }]);
    expect((await member(b, 'select rating from reviews')).rows).toEqual([{ rating: 4 }]);
    expect((await member(b, 'delete from cart_items returning menu_id')).rows).toHaveLength(1);
  });
});

describe('장바구니와 결제', () => {
  test.each([0,21,null])('수량 %s 추가·변경 거부', async qty => {
    for (const sql of [add, setQuantity]) await expect(member(a, sql, ['espresso','hot',qty])).rejects.toThrow('quantity-invalid');
  });
  test.each([['espresso','ice'], ['espresso',''], ['croissant','hot'], ['americano',null]])(
    '메뉴 %s의 온도 %s 거부', async (menu, temp) => {
      for (const sql of [add, setQuantity]) await expect(member(a, sql, [menu,temp,1])).rejects.toThrow('temperature-invalid');
    });
  test('없는 메뉴를 담거나 수량 변경할 수 없다', async () => {
    for (const sql of [add, setQuantity]) await expect(member(a, sql, ['unknown','',1])).rejects.toThrow('menu-unknown');
  });
  test('합산 상한, 기존 행 수량 변경, 온도별 행, 정상 배열 합치기', async () => {
    await member(a, add, ['americano','hot',18]);
    await member(a, merge, [JSON.stringify([cartRow, { ...cartRow, temperature: 'ice' }])]);
    expect((await member(a, 'select temperature, quantity from cart_items order by temperature')).rows)
      .toEqual([{ temperature: 'hot', quantity: 20 }, { temperature: 'ice', quantity: 3 }]);
    await member(a, setQuantity, ['americano','hot',1]);
    expect((await member(a, "select quantity from cart_items where temperature='hot'")).rows).toEqual([{ quantity: 1 }]);
  });
  test.each([
    [null,'quantity-invalid'], [{},'menu-unknown'], [{ ...cartRow, menu_id: 'missing' },'menu-unknown'],
    [{ ...cartRow, temperature: null },'temperature-invalid'], [{ ...cartRow, quantity: 21 },'quantity-invalid'],
    [{ ...cartRow, quantity: 1.5 },'quantity-invalid'], [{ ...cartRow, quantity: '1' },'quantity-invalid'],
    [{ ...cartRow, price: 1 },'quantity-invalid'],
  ] as const)('합치기 중 잘못된 항목이 있으면 앞선 변경도 취소한다 (%j)', async (bad, code) => {
    await member(a, add, ['americano','hot',1]);
    await expect(member(a, merge, [JSON.stringify([cartRow,bad])])).rejects.toThrow(code);
    expect((await member(a, 'select quantity from cart_items')).rows).toEqual([{ quantity: 1 }]);
  });
  test('JSON 배열만 허용한다', async () => {
    for (const input of [null, 'null', '{}']) await expect(member(a, merge, [input])).rejects.toThrow('quantity-invalid');
    await expect(member(a, merge, ['['])).rejects.toMatchObject({ code: '22P02' });
  });
  test('빈 장바구니는 주문할 수 없다', async () => {
    await expect(member(a, place, ['takeout','onsite'])).rejects.toThrow('cart-empty');
    expect((await member(a, 'select * from orders')).rows).toEqual([]);
  });
  test.each([['delivery','online'], ['takeout','other'], [null,'online'], ['dine-in',null]])(
    '잘못된 선택 (%s, %s)은 장바구니를 보존한다', async (receive, pay) => {
      await member(a, add, ['espresso','hot',1]);
      await expect(member(a, place, [receive,pay])).rejects.toThrow('method-invalid');
      expect((await member(a, 'select quantity from cart_items')).rows).toEqual([{ quantity: 1 }]);
    });
  test('품목의 제공 온도와 가격이 바뀌면 결제 시점의 메뉴를 사용한다', async () => {
    await member(a, add, ['americano','hot',2]);
    await db.exec("update menu_items set temperatures=array['ice'], price=5000 where id='americano'");
    try {
      await expect(member(a, place, ['takeout','onsite'])).rejects.toThrow('temperature-invalid');
      expect((await member(a, 'select quantity from cart_items')).rows).toEqual([{ quantity: 2 }]);
      await member(a, 'delete from cart_items');
      await purchase(a, 'americano', 'ice');
    } finally {
      await db.exec("update menu_items set temperatures=array['hot','ice'], price=4800 where id='americano'");
    }
    expect((await member(a, 'select unit_price from order_lines')).rows).toEqual([{ unit_price: 5000 }]);
    expect((await member(a, 'select total from orders')).rows).toEqual([{ total: 5000 }]);
  });
  test('명세 저장이 중간에 실패하면 주문과 장바구니 변경을 함께 되돌린다', async () => {
    await member(a, add, ['espresso','hot',2]);
    // 이미 저장된 과거 주문과 무관하게 새 명세 쓰기에만 실패를 주입합니다.
    await db.exec('alter table order_lines add constraint test_reject_line check (quantity <> 2) not valid');
    try {
      await expect(member(a, place, ['takeout','onsite'])).rejects.toMatchObject({ code: '23514' });
      expect((await member(a, 'select quantity from cart_items')).rows).toEqual([{ quantity: 2 }]);
      expect((await member(a, 'select id from orders')).rows).toEqual([]);
      expect((await member(a, 'select order_id from order_lines')).rows).toEqual([]);
    } finally {
      await db.exec('alter table order_lines drop constraint test_reject_line');
    }
    await member(a, place, ['takeout','onsite']);
    expect((await member(a, 'select quantity from order_lines')).rows).toEqual([{ quantity: 2 }]);
  });
  test.each([['takeout','onsite'], ['takeout','online'], ['dine-in','onsite'], ['dine-in','online']])(
    '%s / %s 주문은 DB 가격을 복사하고 한 번만 생성된다', async (receive, pay) => {
      await member(a, add, ['cookie','',3]);
      await member(a, add, ['espresso','hot',2]);
      await member(b, add, ['cookie','',1]);
      await expect(member(a, "update menu_items set price=1 where id='cookie'")).rejects.toMatchObject({ code: '42501' });
      const { rows: [order] } = await member<{ id: string }>(a, place, [receive,pay]);
      expect((await member(a, `select id, user_id, total, receive_method, payment_method, payment_status,
        order_no ~ ('^' || to_char(created_at at time zone 'Asia/Seoul','YYYYMMDD') || '-[0-9]{6,}$') as number_ok
        from orders`)).rows).toEqual([{ id: order!.id, user_id: a, total: 18500, receive_method: receive,
        payment_method: pay, payment_status: pay === 'online' ? 'mock-paid' : 'onsite-due', number_ok: true }]);
      expect((await member(a, 'select * from order_lines order by menu_id')).rows).toEqual([
        { order_id: order!.id, menu_id: 'cookie', name: '쿠키', temperature: '', quantity: 3, unit_price: 3500 },
        { order_id: order!.id, menu_id: 'espresso', name: '에스프레소', temperature: 'hot', quantity: 2, unit_price: 4000 },
      ]);
      expect((await member(a, 'select * from cart_items')).rows).toEqual([]);
      expect((await member(b, 'select quantity from cart_items')).rows).toEqual([{ quantity: 1 }]);
      await expect(member(a, place, [receive,pay])).rejects.toThrow('cart-empty');
      expect((await member(a, 'select id from orders')).rows).toEqual([order]);
    });
});

describe('리뷰 작성과 수정', () => {
  test('다른 회원의 주문, 내 주문에 없는 메뉴, 위조한 작성자는 거절한다', async () => {
    const own = await purchase(a);
    const other = await purchase(b);
    await expect(review(a, other)).rejects.toMatchObject({ code: '42501' });
    await expect(review(a, own, 'cookie')).rejects.toMatchObject({ code: '42501' });
    await expect(member(a, insertReview, [b,own,'espresso',3,'후기',null])).rejects.toMatchObject({ code: '42501' });
  });
  test('같은 주문·메뉴에 두 번째 리뷰는 거절한다', async () => {
    await member(a, add, ['americano','ice',1]);
    const order = await purchase(a, 'americano', 'hot');
    await review(a, order, 'americano');
    await expect(review(a, order, 'americano')).rejects.toMatchObject({ code: '23505' });
  });
  test.each([[0,'내용'], [6,'내용'], [3,'   '], [3,'\n\t\u3000'], [3,'가'.repeat(501)]] as const)(
    '별점·본문 범위를 검사한다 (사례 %#)', async (rating, body) => {
      await expect(review(a, await purchase(a), 'espresso', rating, body)).rejects.toMatchObject({ code: '23514' });
    });
  test('공백을 뺀 500자와 1자, 별점의 양 끝값, 수정 시각 및 본인 삭제', async () => {
    const order = await purchase(a);
    const id = (await review(a, order, 'espresso', 1, ' ' + '가'.repeat(500) + ' ', a + '/one.jpg')).rows[0]!.id;
    expect((await member(a, 'select updated_at from reviews')).rows).toEqual([{ updated_at: null }]);
    const result = await member(a, `update reviews set rating=5, body=' 가 ', photo_path=null where id=$1
      returning rating, body, photo_path, updated_at >= created_at as touched`, [id]);
    expect(result.rows).toEqual([{ rating: 5, body: ' 가 ', photo_path: null, touched: true }]);
    expect((await member(a, 'delete from reviews where id=$1 returning id', [id])).rows).toEqual([{ id }]);
  });
  test('사진 폴더는 삽입과 수정 시 모두 검사한다', async () => {
    const order = await purchase(a);
    await expect(review(a, order, 'espresso', 4, '후기', b + '/one.jpg')).rejects.toMatchObject({ code: '42501' });
    await review(a, order);
    for (const path of [b + '/one.jpg', a + '-other/one.jpg', 'one.jpg']) {
      await expect(member(a, 'update reviews set photo_path=$1', [path])).rejects.toMatchObject({ code: '42501' });
    }
    expect((await member(a, 'update reviews set photo_path=$1 returning photo_path', [a + '/one.jpg'])).rows)
      .toEqual([{ photo_path: a + '/one.jpg' }]);
  });
  test('리뷰 식별자·작성자·주문·메뉴·시각을 브라우저가 바꿀 수 없다', async () => {
    const order = await purchase(a);
    await review(a, order);
    for (const column of ['id','user_id','order_id','menu_id','created_at','updated_at']) {
      await expect(member(a, `update reviews set ${column}=${column}`)).rejects.toMatchObject({ code: '42501' });
    }
    for (const column of ['id','created_at','updated_at']) {
      await expect(member(a, `insert into reviews(${column}) values (default)`)).rejects.toMatchObject({ code: '42501' });
    }
  });
});

describe('공개 리뷰 목록', () => {
  test('반환 열과 마스킹, 본인 여부·주문 공개, 메뉴·내 리뷰 필터', async () => {
    const order = await purchase(a);
    const id = (await review(a, order)).rows[0]!.id;
    const second = await purchase(b, 'cookie', '');
    await review(b, second, 'cookie', 5);
    const result = await guest(list, ['espresso', false, 'latest']);
    expect(result.fields.map(f => f.name)).toEqual([
      'id','order_id','menu_id','rating','body','photo_path','author_masked','is_mine','created_at','updated_at',
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ id, order_id: null, author_masked: 'Coffee**', is_mine: false });
    for (const privateValue of [a, 'Coffee12', 'coffee12', order]) {
      expect(Object.values(result.rows[0]!)).not.toContain(privateValue);
    }
    expect((await guest(list, [null,true,'latest'])).rows).toEqual([]);
    expect((await member(a, list, [null,true,'latest'])).rows).toEqual([
      expect.objectContaining({ id, author_masked: 'Coffee**', is_mine: true, order_id: order }),
    ]);
    expect((await member(a, list, ['cookie',false,'latest'])).rows).toEqual([
      expect.objectContaining({ author_masked: 'latte9**', is_mine: false, order_id: null }),
    ]);
  });
  test('정렬은 최신순으로 대체되며 날짜·별점 동률은 id 순으로 고정한다', async () => {
    const ids: string[] = [];
    for (const rating of [2,2,5,1]) {
      ids.push((await review(a, await purchase(a), 'espresso', rating)).rows[0]!.id);
    }
    await db.query("update reviews set created_at='2026-10-01'");
    await db.query("update reviews set created_at='2026-10-02' where id=$1", [ids[3]]);
    const tied = ids.slice(0,2).sort();
    const latest = [ids[3], ...ids.slice(0,3).sort()];
    for (const [sort, expected] of [
      ['latest',latest], ['unexpected',latest], [null,latest],
      ['rating-high',[ids[2], ...tied, ids[3]]], ['rating-low',[ids[3], ...tied, ids[2]]],
    ] as const) {
      expect((await guest(list, [null,false,sort])).rows.map(row => row.id)).toEqual(expected);
    }
    expect((await member(a, 'select distinct order_no from orders')).rows).toHaveLength(4);
  });
});

describe('리뷰 사진 보관함', () => {
  const upload = 'insert into storage.objects(bucket_id,name) values ($1,$2)';
  const bucket = 'review-photos';
  const path = a + '/123.jpg';
  test('공개 버킷의 크기·형식 제한이 저장된다', async () => {
    expect((await db.query('select * from storage.buckets')).rows).toEqual([{
      id: bucket, name: bucket, public: true, file_size_limit: 2097152,
      allowed_mime_types: ['image/jpeg','image/png','image/webp'],
    }]);
  });
  test('목록·업로드·삭제는 지정 버킷의 본인 폴더에만 허용한다', async () => {
    await db.query("insert into storage.buckets(id,name) values ('other','other')");
    await member(a, upload, [bucket,path]);
    await member(b, upload, [bucket,b + '/photo.png']);
    expect((await guest('select * from storage.objects')).rows).toEqual([]);
    expect((await member(a, 'select name from storage.objects')).rows).toEqual([{ name: path }]);
    await expect(guest(upload, [bucket, a + '/guest.jpg'])).rejects.toMatchObject({ code: '42501' });
    for (const [target,name] of [[bucket,b + '/fake.jpg'], [bucket,'photo.jpg'], ['other',a + '/one.png']]) {
      await expect(member(a, upload, [target,name])).rejects.toMatchObject({ code: '42501' });
    }
    expect((await member(b, 'delete from storage.objects where name=$1 returning name', [path])).rows).toEqual([]);
    expect((await guest('delete from storage.objects returning name')).rows).toEqual([]);
    expect((await member(a, 'update storage.objects set name=$1 returning name', [b + '/move.jpg'])).rows).toEqual([]);
    expect((await member(a, 'delete from storage.objects returning name')).rows).toEqual([{ name: path }]);
    expect((await member(b, 'select name from storage.objects')).rows).toEqual([{ name: b + '/photo.png' }]);
  });
});
