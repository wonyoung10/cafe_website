/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import {
  addToCart, expect, expectCartCount, horizontalOverflow, openAccountMenu, orderAs, payButton, signUp, solidPng, test, uid, writeReview,
} from './helpers';

// 새 화면이 375px(작은 폰)와 768px(태블릿 경계)에서 가로로 넘치지 않는지 본다.
// 한 화면이 넘쳐도 나머지를 계속 보도록 결과를 모아 마지막에 한꺼번에 단언한다.
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
] as const;

const LONG = '긴글'.repeat(120) + 'ThisIsAnUnbrokenVeryLongWordWithoutAnySpacesThatCouldPushTheLayoutWideEnough'.repeat(2);

async function measure(page: Page, failures: string[], label: string) {
  await page.waitForLoadState('domcontentloaded');
  // 지연 로드 화면이 뜨기를 기다린 뒤 잰다
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const result = await horizontalOverflow(page);
  const wide = Math.max(result.scrollWidth, result.bodyScrollWidth) > result.innerWidth + 1;
  if (wide || result.offenders.length) {
    failures.push(`${label}: scrollWidth=${result.scrollWidth} body=${result.bodyScrollWidth} inner=${result.innerWidth} offenders=${result.offenders.join(' | ')}`);
  }
}

/** 머리글의 요소가 서로 겹치지 않고 화면 안에 있다 */
async function headerFits(page: Page, failures: string[], label: string) {
  const boxes = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return [];
    const targets = [...header.querySelectorAll<HTMLElement>(':scope > div > a, :scope > div > nav, :scope > div > div > a, :scope > div > div > button, :scope > div > div > div')];
    return targets
      .map((element) => ({ name: element.getAttribute('aria-label') ?? element.tagName.toLowerCase(), rect: element.getBoundingClientRect(), shown: getComputedStyle(element).display !== 'none' }))
      .filter((entry) => entry.shown && entry.rect.width > 0)
      .map(({ name, rect }) => ({ name, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
  });
  const inner = page.viewportSize()?.width ?? 0;
  for (const box of boxes) {
    if (box.left < -1 || box.right > inner + 1) failures.push(`${label}: 머리글 요소 ${box.name} 가 화면 밖 (${Math.round(box.left)}..${Math.round(box.right)} / ${inner})`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 1 && overlapY > 1) failures.push(`${label}: 머리글 요소 ${a.name} 와 ${b.name} 가 겹침 (${Math.round(overlapX)}x${Math.round(overlapY)})`);
    }
  }
  const height = await page.evaluate(() => document.querySelector('header')?.getBoundingClientRect().height ?? 0);
  const expected = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) * parseFloat(getComputedStyle(document.documentElement).fontSize));
  if (height > expected + 1) failures.push(`${label}: 머리글 높이가 늘어남 ${height} > ${expected}`);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    test(`비회원이 보는 새 화면들에 가로 넘침이 없다`, async ({ page }) => {
      const failures: string[] = [];
      for (const path of ['/signup', '/login', '/cart', '/reviews', '/reviews?mine=1', '/reviews?menu=cookie', '/login?next=%2Fcheckout']) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await measure(page, failures, `${viewport.width}px ${path}`);
      }
      // 가입 화면의 오류 표시 상태
      await page.goto('/signup', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '회원가입', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await measure(page, failures, `${viewport.width}px /signup (오류 표시)`);
      await page.getByRole('button', { name: '비밀번호 보기', exact: true }).click();
      await measure(page, failures, `${viewport.width}px /signup (비밀번호 보기)`);
      // 비회원이 담은 장바구니
      await page.goto('/menu', { waitUntil: 'domcontentloaded' });
      await addToCart(page, '카라멜 마키아토', 'ICE');
      await addToCart(page, '카라멜 마키아토', 'HOT');
      await page.goto('/cart', { waitUntil: 'domcontentloaded' });
      await measure(page, failures, `${viewport.width}px /cart (비회원, 담김)`);
      await headerFits(page, failures, `${viewport.width}px 머리글(비회원)`);
      expect(failures, failures.join('\n')).toEqual([]);
    });

    test(`로그인한 회원이 보는 모든 새 화면에 가로 넘침이 없다 (두 자리 장바구니 수량 포함)`, async ({ page }) => {
      test.setTimeout(120_000);
      const failures: string[] = [];
      const id = uid('lay');
      await signUp(page, id);

      // 주문·리뷰 만들기: 긴 글과 사진이 있는 리뷰, 사진 없는 리뷰
      const orderId = await orderAs(page, [{ name: '카라멜 마키아토', temperature: 'ICE' }, { name: '치즈케이크' }]);
      await measure(page, failures, `${viewport.width}px /orders/:id`);
      await writeReview(page, orderId, '카라멜 마키아토', { rating: 4, text: LONG, photo: { name: 'wide.png', mimeType: 'image/png', buffer: solidPng(900, 300) } });
      await measure(page, failures, `${viewport.width}px /reviews?mine=1 (긴 글+사진)`);
      await writeReview(page, orderId, '치즈케이크', { rating: 2, text: '짧은 글' });

      for (const path of ['/reviews', '/reviews?mine=1&sort=rating-high', '/orders']) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await measure(page, failures, `${viewport.width}px ${path}`);
      }
      // 삭제 확인 단계
      await page.goto('/reviews?mine=1', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '치즈케이크 리뷰 삭제', exact: true }).click();
      await expect(page.getByRole('group', { name: '치즈케이크 리뷰 삭제 확인' })).toBeVisible();
      await measure(page, failures, `${viewport.width}px /reviews (삭제 확인)`);

      // 리뷰 수정·쓰기 화면
      await page.getByRole('button', { name: '남겨 두기', exact: true }).click();
      await page.getByRole('link', { name: '카라멜 마키아토 리뷰 수정' }).click();
      await expect(page.getByRole('heading', { level: 1, name: '리뷰 수정', exact: true })).toBeVisible();
      await expect(page.getByAltText('지금 리뷰에 있는 사진')).toBeVisible();
      await measure(page, failures, `${viewport.width}px /reviews/:id/edit (긴 글+사진)`);
      await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('가'.repeat(520));
      await measure(page, failures, `${viewport.width}px /reviews/:id/edit (500자 초과 오류)`);

      const second = await orderAs(page, [{ name: '쿠키' }]);
      await page.goto(`/reviews/new?order=${second}&menu=cookie`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
      await expect(page.getByText('별점을 골라 주세요.')).toBeVisible();
      await measure(page, failures, `${viewport.width}px /reviews/new (오류)`);
      await page.locator('#review-photo').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
      await expect(page.locator('#review-photo-error')).toBeVisible();
      await measure(page, failures, `${viewport.width}px /reviews/new (사진 오류)`);
      await page.goto(`/reviews/new?order=nope&menu=cookie`, { waitUntil: 'domcontentloaded' });
      await measure(page, failures, `${viewport.width}px /reviews/new (없는 주문)`);
      await page.goto(`/orders/nope`, { waitUntil: 'domcontentloaded' });
      await measure(page, failures, `${viewport.width}px /orders/:id (없는 주문)`);

      // 결제 화면(오류, 온라인 결제 창) — 카트에 많이 담아 두 자리 수량을 만든다
      await page.goto('/menu', { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 12; i++) await addToCart(page, '카라멜 마키아토', 'HOT');
      await expectCartCount(page, 12);
      await page.goto('/cart', { waitUntil: 'domcontentloaded' });
      await measure(page, failures, `${viewport.width}px /cart (회원, 12개)`);
      await headerFits(page, failures, `${viewport.width}px 머리글(회원, 장바구니 12개)`);
      await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '주문하기', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await measure(page, failures, `${viewport.width}px /checkout (오류)`);
      await page.getByLabel('Take Out', { exact: true }).check();
      await page.getByLabel('온라인 결제', { exact: true }).check();
      await measure(page, failures, `${viewport.width}px /checkout (결제수단)`);
      await page.getByLabel('나이테카드', { exact: true }).check();
      await expect(page.getByRole('combobox', { name: '할부' })).toBeVisible();
      await payButton(page).click();
      const dialog = page.getByRole('dialog', { name: '하루의 잎 결제' });
      const dialogFits = async (step: string) => {
        await expect(dialog).toBeVisible();
        const box = await dialog.boundingBox();
        if (!box || box.x < -1 || box.x + box.width > viewport.width + 1 || box.y < -1 || box.y + box.height > viewport.height + 1) {
          failures.push(`${viewport.width}px 결제창(${step})이 화면 밖: ${JSON.stringify(box)}`);
        }
        await measure(page, failures, `${viewport.width}px /checkout (결제창 ${step})`);
      };
      await dialogFits('확인');
      await dialog.getByRole('button', { name: '인증 요청하기', exact: true }).click();
      await dialogFits('인증');
      await dialog.getByRole('button', { name: '거절하기', exact: true }).click();
      await dialogFits('실패');
      await page.keyboard.press('Escape');

      // 머리글: 계정 메뉴를 연 상태
      const menu = await openAccountMenu(page);
      await expect(menu.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible();
      await headerFits(page, failures, `${viewport.width}px 머리글(계정 메뉴 열림)`);
      await measure(page, failures, `${viewport.width}px 계정 메뉴 열림`);
      const panel = await menu.getByRole('button', { name: '로그아웃', exact: true }).boundingBox();
      if (!panel || panel.x < -1 || panel.x + panel.width > viewport.width + 1) failures.push(`${viewport.width}px 로그아웃 버튼이 화면 밖: ${JSON.stringify(panel)}`);

      expect(failures, failures.join('\n')).toEqual([]);
    });
  });
}

test('모바일 머리글의 새 컨트롤은 44px 이상이다 (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signUp(page, uid('tap'));
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 10; i++) await addToCart(page, '쿠키');
  const small = await page.evaluate(() => {
    const results: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('header a, header button')) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || element.closest('[hidden]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) continue;
      if (rect.width < 44 || rect.height < 44) results.push(`${element.getAttribute('aria-label') ?? element.textContent?.trim()} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }
    return results;
  });
  expect(small, '44px 미만 머리글 컨트롤').toEqual([]);
});
