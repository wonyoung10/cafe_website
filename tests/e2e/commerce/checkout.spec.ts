/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import {
  ORDER_URL, ORDER_WAIT, PASSWORD, addToCart, authorizePayment, checkout, expect, expectCartCount, logIn, logOut, orderIdFromUrl, payButton, payLabel, receiveLabel,
  signUp, test, uid, type Pay, type Receive,
} from './helpers';

const RECEIVE_LABEL: Record<Receive, string> = { takeout: '테이크아웃', 'dine-in': '매장에서' };
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
        if (pay === 'online') {
          await page.getByLabel('나이테카드', { exact: true }).check();
          await payButton(page).click();
          // 승인 전에는 주문이 없다
          const dialog = page.getByRole('dialog', { name: '하루의 잎 결제' });
          await expect(dialog).toContainText('결제 금액 14,100원');
          await expect(dialog).toContainText('아메리카노 ICE 외 1건');
          await expect(page).toHaveURL(/\/checkout$/);
          await authorizePayment(page);
          await expect(dialog.getByRole('heading', { name: '승인을 요청하고 있어요' })).toBeFocused();
          await expect(dialog.getByRole('button')).toHaveCount(0);
          await expect(dialog.getByRole('heading', { name: '결제가 승인됐어요' })).toBeVisible();
        } else await page.getByRole('button', { name: '주문하기', exact: true }).click();

        await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
        await expect(page.getByRole('heading', { level: 1, name: '주문 상세', exact: true })).toBeVisible();
        await expect(page.getByText(/^주문번호 \d{8}-\d{6}$/)).toBeVisible();
        await expect(definition(page, '받는 방법')).toHaveText(RECEIVE_LABEL[receive]);
        await expect(definition(page, '결제 방법')).toHaveText(payLabel[pay]);
        await expect(definition(page, '결제 상태')).toHaveText(STATUS_LABEL[pay]);
        await expect(page.getByRole('heading', { level: 2, name: pay === 'online' ? '결제가 완료됐어요' : '주문이 접수됐어요' })).toBeFocused();
        const receipt = page.getByRole('region', { name: '영수증' });
        if (pay === 'online') {
          await expect(receipt).toContainText('나이테카드');
          await expect(receipt).toContainText('일시불');
          await expect(definition(page, '승인 번호')).toHaveText(/^\d{8}$/);
          await expect(definition(page, '승인 시각')).toContainText('년');
          await expect(definition(page, '승인 금액')).toHaveText('14,100원');
          await expect(receipt).toContainText('실제 결제는 이루어지지 않았고');
        } else await expect(receipt).toHaveCount(0);
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
    await expect(page.getByLabel('테이크아웃', { exact: true })).toBeFocused();
    await expect(page.getByLabel('테이크아웃', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('테이크아웃', { exact: true })).toHaveAccessibleDescription('받는 방법을 선택해 주세요.');
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel('매장에서', { exact: true }).check();
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
    await expect(page.getByRole('button', { name: /주문하기|결제하기/ })).toHaveCount(0);
  });
});

async function fillForm(page: Page, instrument = '나이테카드') {
  await page.getByLabel('테이크아웃', { exact: true }).check();
  await page.getByLabel('온라인 결제', { exact: true }).check();
  await page.getByLabel(instrument, { exact: true }).check();
}

async function openDialog(page: Page, instrument?: string) {
  await signUp(page, uid('dlg'));
  await fillCart(page);
  await page.goto('/cart', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: '결제하기', exact: true }).click();
  await fillForm(page, instrument);
  const opener = payButton(page);
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '하루의 잎 결제' });
  await expect(dialog).toBeVisible();
  return { dialog, opener };
}

test.describe('결제창 (SH-06, SH-07, SH-09~12)', () => {
  test('결제 정보를 받는 입력란이 없고 외부 창도 없다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    for (const step of ['confirm', 'verify']) {
      expect(await dialog.locator('input, textarea, select, iframe, [contenteditable], [role="textbox"], [role="combobox"]').count(), step).toBe(0);
      await expect(dialog.getByRole('button')).toHaveCount(2);
      await expect(dialog).toContainText('실제 결제는 이루어지지 않아요');
      await expect(dialog).not.toContainText(/카드 ?번호|유효기간|CVC|CVV|비밀번호/);
      if (step === 'confirm') await dialog.getByRole('button', { name: '인증 요청하기', exact: true }).click();
    }
    await expect(dialog.getByRole('timer')).toContainText(/남은 시간 [23]:\d\d/);
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
    await authorizePayment(page);
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('취소한 뒤 주문 내역과 장바구니를 확인해도 아무 주문이 없다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await dialog.getByRole('button', { name: '취소', exact: true }).click();
    await expect(dialog).toHaveCount(0);
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
    await expect(page).toHaveURL(/\/checkout$/);
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

  for (const [instrument, title] of [['낙엽카드', '한도를 넘었어요'], ['잎맥페이', '잔액이 부족해요']] as const) {
    test(`${instrument}로 결제하면 거절되고 다른 수단으로 이어서 결제한다`, async ({ page }) => {
      const { dialog } = await openDialog(page, instrument);
      await authorizePayment(page);
      await expect(dialog.getByRole('heading', { name: title })).toBeFocused();
      await expect(dialog).toContainText('장바구니는 그대로예요');
      await dialog.getByRole('button', { name: '다른 결제수단 고르기', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByLabel('나이테카드', { exact: true })).toBeFocused();
      await page.getByLabel('이슬페이', { exact: true }).check();
      await payButton(page).click();
      await authorizePayment(page);
      await expect(page.getByRole('region', { name: '영수증' })).toContainText('이슬페이');
      expect(await ordersListed(page)).toBe(1);
    });
  }

  test('앱에서 거절하면 주문이 없고 같은 창에서 다시 시도할 수 있다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await dialog.getByRole('button', { name: '인증 요청하기', exact: true }).click();
    await dialog.getByRole('button', { name: '거절하기', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: '인증을 거절했어요' })).toBeFocused();
    await dialog.getByRole('button', { name: '다시 시도하기', exact: true }).click();
    await authorizePayment(page);
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('뒤로 가기는 결제창만 닫고, 결제 뒤 뒤로 가기는 장바구니로 간다', async ({ page }) => {
    const { dialog, opener } = await openDialog(page);
    await page.goBack();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByLabel('나이테카드', { exact: true })).toBeChecked();
    await opener.click();
    await authorizePayment(page);
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    const orderUrl = page.url();
    await page.goBack();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText('장바구니가 비어 있어요.')).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(orderUrl);
    // 결제창이 있던 기록으로 앞으로 가도 주문 화면으로 되돌아온다
    await page.goForward();
    await expect(page).toHaveURL(orderUrl);
    expect(await ordersListed(page)).toBe(1);
  });

  test('승인을 기다리는 동안 Esc·뒤로 가기를 눌러도 결과까지 보여 주고 주문은 한 건이다', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await authorizePayment(page);
    await expect(dialog.getByRole('heading', { name: '승인을 요청하고 있어요' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.evaluate(() => history.back());
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '결제가 승인됐어요' })).toBeVisible();
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('결제창에서 새로고침하면 창은 닫히고 고른 값은 남으며 주문은 없다', async ({ page }) => {
    const { dialog } = await openDialog(page, '가지카드');
    await dialog.getByRole('button', { name: '인증 요청하기', exact: true }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('가지카드', { exact: true })).toBeChecked();
    await expect(dialog).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/cart$/);
    expect(await ordersListed(page)).toBe(0);
  });

  test('다른 브라우저에서 연 영수증은 결제수단 이름 없이 같은 승인 번호를 보여 준다', async ({ page }) => {
    await openDialog(page);
    await authorizePayment(page);
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    const number = await definition(page, '승인 번호').textContent();
    await page.evaluate(() => localStorage.removeItem('haru-leaf:payment-receipts'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(definition(page, '승인 번호')).toHaveText(number ?? '');
    await expect(definition(page, '결제수단')).toHaveText('온라인 결제');
  });
});

test.describe('중복 주문 방지 (SH-07)', () => {
  test('현장 결제: 주문하기를 더블클릭해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('dbl'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('매장에서', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    await page.getByRole('button', { name: '주문하기', exact: true }).dblclick();
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('온라인 결제: 승인을 더블클릭해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('dbo'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('매장에서', { exact: true }).check();
    await page.getByLabel('온라인 결제', { exact: true }).check();
    await page.getByLabel('이슬페이', { exact: true }).check();
    await payButton(page).dblclick();
    await page.getByRole('dialog').getByRole('button', { name: '인증 요청하기', exact: true }).dblclick();
    // 두 번째 클릭이 같은 자리의 인증 버튼을 눌러 인증을 건너뛰지 않는다
    await expect(page.getByRole('dialog').getByRole('heading', { name: '이슬페이 앱 인증' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '인증하고 결제하기', exact: true }).dblclick();
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('Enter를 연타해도 주문은 한 건이다', async ({ page }) => {
    await signUp(page, uid('ent'));
    await fillCart(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('테이크아웃', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    const submit = page.getByRole('button', { name: '주문하기', exact: true });
    await submit.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    expect(await ordersListed(page)).toBe(1);
  });

  test('주문 뒤 브라우저 뒤로가기·새로고침·직접 /checkout 이동으로 두 번째 주문이 생기지 않는다', async ({ page }) => {
    await signUp(page, uid('bak'));
    await fillCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: '결제하기', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByLabel('테이크아웃', { exact: true }).check();
    await page.getByLabel('현장 결제', { exact: true }).check();
    await page.getByRole('button', { name: '주문하기', exact: true }).click();
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
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
    await expect(page.getByRole('button', { name: /주문하기|결제하기/ })).toHaveCount(0);
    expect(await ordersListed(page)).toBe(1);
  });

  test('같은 장바구니로 두 탭에서 동시에 주문하면 한 건만 만들어지고 다른 탭은 이유를 알려 준다', async ({ page, context }) => {
    await signUp(page, uid('tab'));
    await fillCart(page);
    const other = await context.newPage();
    for (const tab of [page, other]) {
      await tab.goto('/checkout', { waitUntil: 'domcontentloaded' });
      await tab.getByLabel('테이크아웃', { exact: true }).check();
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

  test('두 탭에서 같은 장바구니를 온라인으로 결제해도 주문은 한 건이다', async ({ page, context }) => {
    await signUp(page, uid('tbo'));
    await fillCart(page);
    const other = await context.newPage();
    for (const tab of [page, other]) {
      await tab.goto('/checkout', { waitUntil: 'domcontentloaded' });
      await fillForm(tab);
      await payButton(tab).click();
    }
    await authorizePayment(page);
    await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
    await authorizePayment(other);
    await expect(other.getByRole('heading', { name: '이미 처리된 주문이에요' })).toBeVisible();
    await other.getByRole('link', { name: '주문 내역 보기', exact: true }).click();
    await expect(other).toHaveURL(/\/orders$/);
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
    await expect(definition(page, '받는 방법')).toHaveText('테이크아웃');
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
