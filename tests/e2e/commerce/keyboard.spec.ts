/// <reference lib="dom" />
import { PASSWORD, expect, menuCard, openAccountMenu, tabTo, test, uid } from './helpers';

// 마우스를 쓰지 않고(클릭 없음) Tab·Shift+Tab·방향키·Space·Enter·Esc 로만 가입부터 리뷰까지 간다.
// 각 단계의 출발은 goto 이거나 앞 단계의 키 입력이다. tabTo 는 Tab 으로 실제로 닿을 수 있는지 증명한다.

test('키보드만으로 가입 → 담기 → 결제(모의) → 리뷰 쓰기까지 갈 수 있다', async ({ page }) => {
  test.setTimeout(120_000);
  const id = uid('kb');

  // 가입
  await page.goto('/signup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '회원가입', exact: true })).toBeVisible();
  await tabTo(page, page.getByLabel('아이디', { exact: true }));
  await page.keyboard.type(id);
  await tabTo(page, page.getByLabel('비밀번호', { exact: true }));
  await page.keyboard.type(PASSWORD);
  await tabTo(page, page.getByLabel('비밀번호 확인', { exact: true }));
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: '당신의 하루에, 잎사귀 하나.' })).toBeVisible();

  // 메뉴소개로: 머리글 링크
  await tabTo(page, page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '메뉴소개', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/menu$/);

  // 아메리카노: 방향키로 ICE 고르고 Space/Enter 로 담는다
  const card = menuCard(page, '아메리카노');
  await tabTo(page, card.getByRole('radio', { name: 'HOT' }));
  await page.keyboard.press('ArrowRight');
  await expect(card.getByRole('radio', { name: 'ICE' })).toBeChecked();
  await tabTo(page, card.getByRole('button', { name: '담기', exact: true }));
  const ring = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return { outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, shadow: style.boxShadow !== 'none' };
  });
  expect(ring.outline || ring.shadow, '키보드 초점 표시').toBe(true);
  await page.keyboard.press('Enter');
  await expect(card.getByRole('status')).toHaveText('아메리카노 ICE 메뉴를 장바구니에 담았어요.');
  // BUG-02 때문에 초점이 body 로 떨어지므로, 다음 키 입력을 위해 버튼에 초점을 되돌려 준다 (아래 별도 테스트 참고)
  await card.getByRole('button', { name: '담기', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('banner').getByRole('link', { name: '장바구니, 2개' })).toBeVisible();

  // 장바구니 → 결제
  await tabTo(page, page.getByRole('banner').getByRole('link', { name: /^장바구니,/ }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('group', { name: '아메리카노 ICE 수량' })).toContainText('2개');
  await tabTo(page, page.getByRole('button', { name: '아메리카노 ICE 수량 줄이기' }));
  await page.keyboard.press('Space');
  await expect(page.getByRole('group', { name: '아메리카노 ICE 수량' })).toContainText('1개');
  await tabTo(page, page.getByRole('link', { name: '결제하기', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/checkout$/);

  // 받는 방법·결제 방법: 라디오는 Space 와 방향키
  await tabTo(page, page.getByLabel('테이크아웃', { exact: true }));
  await page.keyboard.press('Space');
  await expect(page.getByLabel('테이크아웃', { exact: true })).toBeChecked();
  await tabTo(page, page.getByLabel('현장 결제', { exact: true }));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('온라인 결제', { exact: true })).toBeChecked();
  await tabTo(page, page.getByRole('button', { name: '모의 결제하기', exact: true }));
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '모의 결제' });
  await expect(dialog).toBeVisible();
  // 창이 열리면 초점이 창 안으로 들어온다
  await expect(dialog.getByRole('button', { name: '취소', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '모의 결제 승인', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  await expect(page.getByText('모의 결제 완료').first()).toBeVisible();

  // 리뷰 쓰기
  await tabTo(page, page.getByRole('link', { name: '아메리카노 리뷰 쓰기', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: '리뷰 쓰기', exact: true })).toBeVisible();
  await tabTo(page, page.getByRole('radio', { name: /^1점/ }));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^5점/ })).toBeChecked();
  await tabTo(page, page.getByRole('textbox', { name: '리뷰', exact: true }));
  await page.keyboard.type('키보드만으로 남긴 리뷰');
  await tabTo(page, page.locator('#review-photo'));
  await tabTo(page, page.getByRole('button', { name: '리뷰 남기기', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/reviews\?mine=1/);
  await expect(page.getByRole('article').filter({ hasText: '키보드만으로 남긴 리뷰' })).toBeVisible();

  // 삭제 확인도 키보드로: Enter → 안전한 선택지에 초점 → Esc
  await tabTo(page, page.getByRole('button', { name: '아메리카노 리뷰 삭제', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '남겨 두기', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '아메리카노 리뷰 삭제', exact: true })).toBeFocused();
});

test('계정 메뉴는 Enter로 열리고 Esc로 닫히며 초점이 열었던 버튼으로 돌아온다', async ({ page }) => {
  await page.goto('/signup', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('아이디', { exact: true }).fill(uid('am'));
  await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(PASSWORD);
  await page.getByLabel('비밀번호 확인', { exact: true }).press('Enter');
  const trigger = page.getByRole('button', { name: /^내 계정/ });
  await expect(trigger).toBeVisible();
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = await openAccountMenu(page);
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: '주문 내역', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test.describe('키보드 초점 유지', () => {
  // BUG-02: 담기 버튼이 처리 중 disabled 가 되어 초점이 body 로 떨어진다. 키보드 사용자는 다음 Tab 이 문서 맨 위에서 다시 시작된다.
  test('BUG-02 담기를 Enter로 누른 뒤에도 초점이 담기 버튼에 남는다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    const card = menuCard(page, '쿠키');
    const add = card.getByRole('button', { name: '담기', exact: true });
    await tabTo(page, add);
    await page.keyboard.press('Enter');
    await expect(card.getByRole('status')).toContainText('담았어요');
    await expect(add).toBeFocused({ timeout: 2000 });
  });

  // BUG-03: 장바구니의 수량 버튼도 처리 중 disabled 가 되어 같은 문제가 생긴다.
  test('BUG-03 수량 늘리기를 키보드로 누른 뒤에도 초점이 그 버튼에 남는다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    const cookie = page.getByRole('article').filter({ has: page.getByRole('heading', { name: '쿠키', exact: true }) });
    await cookie.getByRole('button', { name: '담기', exact: true }).click();
    await expect(cookie.getByRole('status')).toContainText('담았어요');
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    const plus = page.getByRole('button', { name: '쿠키 수량 늘리기' });
    await tabTo(page, plus);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('group', { name: '쿠키 수량' })).toContainText('2개');
    await expect(plus).toBeFocused({ timeout: 2000 });
  });
});
