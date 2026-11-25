/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import {
  PASSWORD, addToCart, checkout, expect, expectCartCount, logIn, logOut, orderIdFromUrl, payLabel, receiveLabel,
  signUp, test, uid, type Pay, type Receive,
} from './helpers';

const RECEIVE_LABEL: Record<Receive, string> = { takeout: 'Take Out', 'dine-in': 'Take In' };
const STATUS_LABEL: Record<Pay, string> = { onsite: '현장에서 결제 예정', online: '모의 결제 완료' };

/** 아메리카노 ICE 2잔 + 크루아상 1개 = 14,100원 */
async function fillCart(page: Page) {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  await addToCart(page, '아메리카노', 'ICE');
  await addToCart(page, '아메리카노', 'ICE');
  await addToCart(page, '크루아상');
  await expectCartCount(page, 3);
}

function definition(page: Page, term: string) {
  return page.locator('dt', { hasText: term }).locator('xpath=following-sibling::dd[1]');
}

async function ordersListed(page: Page): Promise<number> {
  await page.goto('/orders', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '주문 내역', exact: true })).toBeVisible();
  await expect(page.getByText('주문 내역을 불러오고 있어요.')).toHaveCount(0);
  return page.getByRole('main').getByRole('link', { name: /주문번호/ }).count();
}

test.describe('받는 방법 × 결제 방법 네 조합 (SH-04, SH-05, SH-06, SH-07, SH-08)', () => {
  for (const receive of ['takeout', 'dine-in'] as const) {
    for (const pay of ['onsite', 'online'] as const) {
      test(`${RECEIVE_LABEL[receive]} + ${payLabel[pay]}`, async ({ page }) => {
        await signUp(page, uid('ord'));
        await fillCart(page);
        await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 1, name: '결제', exact: true })).toBeVisible();
        await expect(page.getByText('모의 주문이에요. 어떤 결제 방법을 선택해도 실제 결제는 이루어지지 않아요.')).toBeVisible();
        await expect(page.getByRole('region', { name: '주문 요약' })).toContainText('14,100원');

        await page.getByLabel(receiveLabel[receive], { exact: true }).check();
        await page.getByLabel(payLabel[pay], { exact: true }).check();
        const submit = page.getByRole('button', { name: pay === 'online' ? '모의 결제하기' : '주문하기', exact: true });
        await submit.click();

        if (pay === 'online') {
          // 승인 전에는 주문이 없다
          const dialog = page.getByRole('dialog', { name: '모의 결제' });
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText('결제 금액 14,100원');
          await expect(page).toHaveURL(/\/checkout$/);
          await dialog.getByRole('button', { name: '모의 결제 승인', exact: true }).click();
        }

        await expect(page).toHaveURL(/\/orders\/[^/]+$/);
        await expect(page.getByRole('heading', { level: 1, name: '주문 상세', exact: true })).toBeVisible();
        await expect(page.getByText(/^주문번호 \d{8}-\d{6}$/)).toBeVisible();
        await expect(definition(page, '받는 방법')).toHaveText(RECEIVE_LABEL[receive]);
        await expect(definition(page, '결제 방법')).toHaveText(payLabel[pay]);
        await expect(definition(page, '결제 상태')).toHaveText(STATUS_LABEL[pay]);
        const summary = page.getByRole('region', { name: '주문 요약' });
        await expect(summary).toContainText('아메리카노 ICE');
        await expect(summary).toContainText('4,800원 × 2개');
        await expect(summary).toContainText('크루아상');
        await expect(summary).toContainText('14,100원');

        // SH-07 장바구니는 비워진다
        await expectCartCount(page, 0);
        await page.goto('/cart', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();

        // SH-08 주문 내역에 한 건
        expect(await ordersListed(page)).toBe(1);
        const entry = page.getByRole('main').getByRole('link', { name: /주문번호/ });
        await expect(entry).toContainText(STATUS_LABEL[pay]);
        await expect(entry).toContainText('14,100원');
        await entry.click();
        await expect(page.getByRole('heading', { level: 1, name: '주문 상세', exact: true })).toBeVisible();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(definition(page, '결제 방법')).toHaveText(payLabel[pay]);
      });
    }
  }
});

test.describe('결제 화면의 입력 검사 (SH-04, SH-05)', () => {
  test('아무것도 고르지 않고 제출하면 첫 항목으로 초점을 보내고 주문하지 않는다', async ({ page }) => {
    await signUp(page, uid('val'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    const submit = page.getByRole('button', { name: '주문하기', exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole('alert').filter({ hasText: '받는 방법을 선택해 주세요.' })).toBeVisible();
    await expect(page.getByLabel('Take Out', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Take Out', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Take Out', { exact: true })).toHaveAccessibleDescription('받는 방법을 선택해 주세요.');
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel('Take In', { exact: true }).check();
    await submit.click();
    await expect(page.getByRole('alert').filter({ hasText: '결제 방법을 선택해 주세요.' })).toBeVisible();
    await expect(page.getByLabel('현장 결제', { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\/checkout$/);
    await expectCartCount(page, 3);
  });

  test('장바구니가 비어 있으면 결제 폼 대신 안내를 보여 준다', async ({ page }) => {
    await signUp(page, uid('emp'));
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await expect(page.getByRole('button', { name: /주문하기|모의 결제하기/ })).toHaveCount(0);
  });
});

test.describe('모의 결제 창 (SH-06, SH-07)', () => {
  async function openDialog(page: Page) {
    await signUp(page, uid('dlg'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Take Out', { exact: true }).check();
    await page.getByLabel('온라인 결제', { exact: true }).check();
    const opener = page.getByRole('button', { name: '모의 결제하기', exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: '모의 결제' });
    await expect(dialog).toBeVisible();
    return { dialog, opener };
  }

  test('결제 정보를 받는 입력란이 없고 외부 창도 없다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    expect(await dialog.locator('input, textarea, select, iframe, [contenteditable], [role="textbox"], [role="combobox"]').count()).toBe(0);
    await expect(dialog.getByRole('button')).toHaveCount(2);
    await expect(dialog.getByRole('button', { name: '취소', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '모의 결제 승인', exact: true })).toBeVisible();
    await expect(dialog).toContainText('실제 결제는 이루어지지 않아요');
    await expect(dialog).not.toContainText(/카드 ?번호|유효기간|CVC|CVV|비밀번호/);
    expect(await page.locator('iframe').count()).toBe(0);
  });

  test('취소하면 주문을 만들지 않고 장바구니를 유지한다', async ({ page }) => {
    const { dialog, opener } = await openDialog(page);
    await dialog.getByRole('button', { name: '취소', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(page).toHaveURL(/\/checkout$/);
    await expectCartCount(page, 3);
    // 다시 열어서 승인해도 주문은 한 건이다
    await opener.click();
    await page.getByRole('dialog').getByRole('button', { name: '모의 결제 승인', exact: true }).click();
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    expect(await ordersListed(page)).toBe(1);
  });

  test('취소한 뒤 주문 내역과 장바구니를 확인해도 아무 주문이 없다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await dialog.getByRole('button', { name: '취소', exact: true }).click();
    expect(await ordersListed(page)).toBe(0);
    await expect(page.getByText('아직 주문 내역이 없어요.')).toBeVisible();
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('group', { name: '아메리카노 ICE 수량' })).toContainText('2개');
  });

  test('Esc로 닫히고 초점이 결제하기 버튼으로 돌아온다', async ({ page }) => {
    const { dialog, opener } = await openDialog(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expectCartCount(page, 3);
    expect(await ordersListed(page)).toBe(0);
  });

  test('창이 열려 있는 동안 초점은 창 안에서만 돈다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    // 네이티브 모달은 배경을 inert로 만든다. 끝에서 Tab을 누르면 브라우저 화면(문서의 body)으로 나갈 수는 있어도 뒤쪽 페이지 요소에는 닿지 않는다.
    const inside = () => page.evaluate(() => {
      const active = document.activeElement;
      return active === document.body || active === null || Boolean(active.closest('dialog[open]'));
    });
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i + 1}번째 초점이 창 밖으로 나갔다`).toBe(true);
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside(), `Shift+Tab ${i + 1}번째 초점이 창 밖으로 나갔다`).toBe(true);
    }
    await expect(dialog).toBeVisible();
  });
});

test.describe('중복 주문 방지 (SH-07)', () => {
  test('현장 결제: 주문하기를 더블클릭해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('dbl'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Take In', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    await page.getByRole('button', { name: '주문하기', exact: true }).dblclick();
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    expect(await ordersListed(page)).toBe(1);
  });

  test('온라인 결제: 승인을 더블클릭해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('dbo'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Take In', { exact: true }).check();
    await page.getByLabel('온라인 결제', { exact: true }).check();
    await page.getByRole('button', { name: '모의 결제하기', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '모의 결제 승인', exact: true }).dblclick();
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    expect(await ordersListed(page)).toBe(1);
  });

  test('Enter를 연타해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('ent'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Take Out', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    const submit = page.getByRole('button', { name: '주문하기', exact: true });
    await submit.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    expect(await ordersListed(page)).toBe(1);
  });

  test('주문 뒤 브라우저 뒤로가기·새로고침·직접 /checkout 이동으로 두 번째 주문이 생기지 않는다', async ({ page }) => {
    await signUp(page, uid('bak'));
    await fillCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: '결제하기', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByLabel('Take Out', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    await page.getByRole('button', { name: '주문하기', exact: true }).click();
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    const orderUrl = page.url();

    await page.goBack();
    // 결제 화면은 기록에서 주문 상세로 바뀌었으므로 장바구니로 돌아간다
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(orderUrl);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(orderUrl);

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await expect(page.getByRole('button', { name: /주문하기|모의 결제하기/ })).toHaveCount(0);
    expect(await ordersListed(page)).toBe(1);
  });

  test('같은 장바구니로 두 탭에서 동시에 주문하면 한 건만 만들어지고 다른 탭은 이유를 알려 준다', async ({ page, context }) => {
    await signUp(page, uid('tab'));
    await fillCart(page);
    const other = await context.newPage();
    for (const tab of [page, other]) {
      await tab.goto('/checkout', { waitUntil: 'domcontentloaded' });
      await tab.getByLabel('Take Out', { exact: true }).check();
      await tab.getByLabel('현장 결제', { exact: true }).check();
      await expect(tab.getByRole('button', { name: '주문하기', exact: true })).toBeEnabled();
    }
    await Promise.all([
      page.getByRole('button', { name: '주문하기', exact: true }).click(),
      other.getByRole('button', { name: '주문하기', exact: true }).click(),
    ]);
    // 한쪽은 주문 상세로, 다른 쪽은 장바구니가 비었다는 오류
    await expect.poll(async () => [page, other].filter((tab) => /\/orders\/[^/]+$/.test(tab.url())).length).toBe(1);
    const loser = /\/orders\/[^/]+$/.test(page.url()) ? other : page;
    await expect(loser.getByRole('alert').filter({ hasText: '메뉴를 먼저 장바구니에 담아 주세요.' })).toBeVisible();
    await expect(loser.getByRole('link', { name: '주문 내역 확인', exact: true })).toBeVisible();
    expect(await ordersListed(page)).toBe(1);
    await other.close();
  });
});

test.describe('주문 내역과 상세 (SH-08)', () => {
  test('주문은 최신순으로 나열되고 각각의 상세가 열린다', async ({ page }) => {
    await signUp(page, uid('lst'));
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '쿠키');
    const first = await checkout(page, 'takeout', 'onsite');
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '스콘');
    await addToCart(page, '스콘');
    const second = await checkout(page, 'dine-in', 'online');
    expect(second).not.toBe(first);

    expect(await ordersListed(page)).toBe(2);
    const links = page.getByRole('main').getByRole('link', { name: /주문번호/ });
    await expect(links.nth(0)).toContainText('8,000원'); // 스콘 2개: 최신 주문이 위
    await expect(links.nth(1)).toContainText('3,500원');
    await links.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${first}$`));
    await expect(definition(page, '받는 방법')).toHaveText('Take Out');
  });

  test('로그인하지 않은 사람의 /orders 와 /checkout 은 로그인 화면으로 보낸다', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Forders$/);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
  });

  test('남의 주문 주소는 찾을 수 없다고 안내하고 내용을 보여 주지 않는다 (같은 브라우저, 두 회원)', async ({ page }) => {
    const owner = uid('own');
    await signUp(page, owner);
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    await addToCart(page, '카페라떼', 'HOT');
    const orderId = await checkout(page, 'takeout', 'onsite');
    await expect(page.getByRole('region', { name: '주문 요약' })).toContainText('카페라떼 HOT');
    await logOut(page);

    await signUp(page, uid('oth'));
    await page.goto(`/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('주문을 찾을 수 없어요.')).toBeVisible();
    await expect(page.getByRole('region', { name: '주문 요약' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('카페라떼');
    await expect(page.locator('body')).not.toContainText('주문번호');
    expect(await ordersListed(page)).toBe(0);
    await expect(page.getByText('아직 주문 내역이 없어요.')).toBeVisible();

    // 원래 주인은 계속 볼 수 있다
    await logOut(page);
    await logIn(page, owner, PASSWORD);
    await page.goto(`/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('region', { name: '주문 요약' })).toContainText('카페라떼 HOT');
  });

  for (const bad of ['not-a-uuid', '00000000-0000-0000-0000-000000000000', '..%2F..%2Fadmin', '%3Cscript%3E']) {
    test(`잘못된 주문 주소 ${bad} 는 찾을 수 없다고 안내한다`, async ({ page }) => {
      await signUp(page, uid('bad'));
      await page.goto(`/orders/${bad}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText('주문을 찾을 수 없어요.')).toBeVisible();
    });
  }
});

test('주문 직후 주소는 새 창에서도 같은 회원이면 그대로 열린다 (AU-06 + SH-08)', async ({ page, context }) => {
  await signUp(page, uid('sess'));
  await fillCart(page);
  const id = await checkout(page, 'takeout', 'online');
  const second = await context.newPage();
  await second.goto(`/orders/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(second.getByRole('heading', { level: 1, name: '주문 상세', exact: true })).toBeVisible();
  expect(orderIdFromUrl(second)).toBe(id);
  await expect(second.getByRole('region', { name: '주문 요약' })).toContainText('14,100원');
});
