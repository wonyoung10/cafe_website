/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import { PASSWORD, addToCart, expect, expectCartCount, logOut, menuCard, signUp, test, uid } from './helpers';

const GUEST_KEY = 'haru-leaf:guest-cart';

function line(page: Page, name: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
}

function totalRow(page: Page, amount: string) {
  return page.locator('p').filter({ hasText: '합계' }).filter({ hasText: amount });
}

async function guestStorage(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), GUEST_KEY);
}

test.describe('장바구니 담기 (SH-01)', () => {
  test('온도는 HOT·ICE가 둘 다 있는 메뉴에서만 고른다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    const americano = menuCard(page, '아메리카노').getByRole('group', { name: '아메리카노 온도' });
    await expect(americano.getByRole('radio')).toHaveCount(2);
    await expect(americano.getByRole('radio', { name: 'HOT' })).toBeChecked();
    for (const name of ['에스프레소', '크루아상', '콜드브루']) {
      await expect(menuCard(page, name).getByRole('group', { name: `${name} 온도` })).toHaveCount(0);
      await expect(menuCard(page, name).getByRole('button', { name: '담기', exact: true })).toBeVisible();
    }
  });

  test('모든 메뉴 카드에 담기 버튼이 있다 (23개)', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(23);
    await expect(page.getByRole('article').getByRole('button', { name: '담기', exact: true })).toHaveCount(23);
  });

  test('로그인하지 않아도 담을 수 있고, 같은 메뉴·온도는 한 줄로 합쳐진다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '아메리카노', 'ICE');
    await expect(menuCard(page, '아메리카노').getByRole('status')).toHaveText('아메리카노 ICE 메뉴를 장바구니에 담았어요.');
    await expectCartCount(page, 1);
    await addToCart(page, '아메리카노', 'ICE');
    await expectCartCount(page, 2);
    await addToCart(page, '아메리카노', 'HOT');
    await expectCartCount(page, 3);
    await addToCart(page, '크루아상');
    await expectCartCount(page, 4);

    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: '장바구니', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: '아메리카노 ICE 수량' })).toContainText('2개');
    await expect(page.getByRole('group', { name: '아메리카노 HOT 수량' })).toContainText('1개');
    await expect(page.getByRole('group', { name: '크루아상 수량' })).toContainText('1개');
    await expect(totalRow(page, '18,900원')).toBeVisible(); // 4,800×3 + 4,500
  });

  test('SH-03 비로그인 장바구니는 새로고침해도 남는다', async ({ page }) => {
    await addToCart(page, '에스프레소');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectCartCount(page, 1);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '에스프레소 HOT', exact: true })).toBeVisible();
  });

  test('한 메뉴는 최대 20개까지만 담긴다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 20; i++) await addToCart(page, '쿠키');
    await expectCartCount(page, 20);
    await menuCard(page, '쿠키').getByRole('button', { name: '담기', exact: true }).click();
    await expect(menuCard(page, '쿠키').getByRole('status')).toContainText('최대 20개까지 담을 수 있어요');
    await expectCartCount(page, 20);
  });
});

test.describe('장바구니 화면 (SH-02)', () => {
  test('수량 변경·합계·삭제 확인·빈 장바구니', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '에스프레소');
    await addToCart(page, '아메리카노', 'ICE');
    await addToCart(page, '아메리카노', 'ICE');
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(totalRow(page, '13,600원')).toBeVisible();

    const ice = '아메리카노 ICE';
    await page.getByRole('button', { name: `${ice} 수량 늘리기` }).click();
    await expect(page.getByRole('group', { name: `${ice} 수량` })).toContainText('3개');
    await expect(totalRow(page, '18,400원')).toBeVisible();
    await expectCartCount(page, 4);
    await expect(page.getByRole('status').filter({ hasText: `${ice} 수량을 3개로 변경했어요.` })).toBeVisible();

    await page.getByRole('button', { name: `${ice} 수량 줄이기` }).click();
    await page.getByRole('button', { name: `${ice} 수량 줄이기` }).click();
    await expect(page.getByRole('group', { name: `${ice} 수량` })).toContainText('1개');
    await expect(page.getByRole('button', { name: `${ice} 수량 줄이기` })).toBeDisabled();
    await expect(totalRow(page, '8,800원')).toBeVisible();

    // 삭제: 취소하면 그대로, 초점은 삭제 버튼으로 돌아온다
    await page.getByRole('button', { name: `${ice} 삭제`, exact: true }).click();
    const confirm = page.getByRole('group', { name: `${ice} 삭제 확인` });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole('button', { name: '취소', exact: true })).toBeFocused();
    await confirm.getByRole('button', { name: '취소', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByRole('button', { name: `${ice} 삭제`, exact: true })).toBeFocused();
    await expectCartCount(page, 2);

    await page.getByRole('button', { name: `${ice} 삭제`, exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(line(page, ice)).toHaveCount(0);
    await expectCartCount(page, 1);
    await expect(totalRow(page, '4,000원')).toBeVisible();

    await page.getByRole('button', { name: '에스프레소 HOT 삭제', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await expect(page.getByRole('link', { name: '메뉴 보러 가기', exact: true })).toBeFocused();
    await expectCartCount(page, 0);
  });

  test('수량은 20개를 넘길 수 없다', async ({ page }) => {
    await addToCart(page, '스콘');
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    const plus = page.getByRole('button', { name: '스콘 수량 늘리기' });
    for (let n = 2; n <= 20; n++) {
      await plus.click();
      await expect(page.getByRole('group', { name: '스콘 수량' })).toContainText(`${n}개`);
    }
    await expect(plus).toBeDisabled();
    await expect(totalRow(page, '80,000원')).toBeVisible();
  });

  test('머리글의 담은 수량이 두 자리여도 표시된다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 12; i++) await addToCart(page, '휘낭시에');
    await expectCartCount(page, 12);
    await expect(page.getByRole('banner').getByRole('link', { name: '장바구니, 12개' })).toContainText('12');
  });

  test('비어 있는 장바구니는 안내와 메뉴 링크를 보여 준다', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: '메뉴 보러 가기', exact: true }).click();
    await expect(page).toHaveURL(/\/menu$/);
  });
});

test.describe('비로그인 장바구니와 로그인 (SH-03)', () => {
  test('비로그인으로 담은 뒤 결제하면 로그인으로 보내고, 로그인하면 결제 화면에서 이어진다', async ({ page }) => {
    const id = uid('gc');
    await signUp(page, id);
    await logOut(page);

    await addToCart(page, '아메리카노', 'ICE');
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    const pay = page.getByRole('link', { name: '결제하기', exact: true });
    await expect(pay).toHaveAttribute('href', '/login?next=/checkout');
    await pay.click();
    await expect(page).toHaveURL(/\/login\?next=\/checkout$/);
    await page.getByLabel('아이디', { exact: true }).fill(id);
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { level: 1, name: '결제', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: '주문 요약' })).toContainText('아메리카노 ICE');
  });

  test('로그인하면 내 장바구니와 합친다 (같은 메뉴는 수량을 더한다)', async ({ page }) => {
    const id = uid('mg');
    await signUp(page, id);
    await addToCart(page, '아메리카노', 'ICE');
    await addToCart(page, '아메리카노', 'ICE');
    await addToCart(page, '에스프레소');
    await expectCartCount(page, 3);
    await logOut(page);
    await expectCartCount(page, 0);

    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '아메리카노', 'ICE');
    await addToCart(page, '크루아상');
    await expectCartCount(page, 2);
    expect(await guestStorage(page)).not.toBeNull();

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('아이디', { exact: true }).fill(id);
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expectCartCount(page, 5);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('group', { name: '아메리카노 ICE 수량' })).toContainText('3개');
    await expect(page.getByRole('group', { name: '에스프레소 HOT 수량' })).toContainText('1개');
    await expect(page.getByRole('group', { name: '크루아상 수량' })).toContainText('1개');
    await expect(totalRow(page, '22,900원')).toBeVisible(); // 4,800×3 + 4,000 + 4,500
    expect(await guestStorage(page)).toBeNull();

    // 새로고침해도 한 번만 합쳐졌다
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectCartCount(page, 5);
  });

  test('다른 회원의 장바구니는 보이지 않는다 (같은 브라우저)', async ({ page }) => {
    await signUp(page, uid('ca'));
    await addToCart(page, '카페라떼', 'HOT');
    await expectCartCount(page, 1);
    await logOut(page);
    await signUp(page, uid('cb'));
    await expectCartCount(page, 0);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
  });
});
