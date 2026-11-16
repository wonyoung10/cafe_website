import { expect, test } from './fixtures';

declare global {
  interface Window { __spaMarker?: number }
}

const routes = [
  { path: '/', heading: '당신의 하루에, 잎사귀 하나.', title: '하루의 잎 — 당신의 하루에, 잎사귀 하나' },
  { path: '/menu', heading: '메뉴소개', title: '메뉴소개 · 하루의 잎' },
  { path: '/store', heading: '매장', title: '매장 · 하루의 잎' },
  { path: '/location', heading: '오시는 길', title: '오시는 길 · 하루의 잎' },
] as const;

for (const route of routes) {
  test(`${route.path} 직접 진입 시 제목과 h1을 표시한다`, async ({ page, isMobile }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: route.heading, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(route.title);
    if (route.path !== '/') {
      if (isMobile) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
      const nav = page.getByRole('navigation', { name: isMobile ? '모바일 메뉴' : '주 메뉴', exact: true });
      await expect(nav.getByRole('link', { name: route.heading, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }
  });
}

test('헤더 링크는 SPA 이동하고 로고는 홈으로 돌아간다', async ({ page, isMobile }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => { window.__spaMarker = 1; });
  for (const route of routes.slice(1)) {
    if (isMobile) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    const nav = page.getByRole('navigation', { name: isMobile ? '모바일 메뉴' : '주 메뉴', exact: true });
    await nav.getByRole('link', { name: route.heading, exact: true }).click();
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole('heading', { level: 1, name: route.heading, exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.__spaMarker)).toBe(1);
  }
  await page.getByRole('banner').getByRole('link', { name: '하루의 잎 홈으로', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(routes[0].heading);
  expect(await page.evaluate(() => window.__spaMarker)).toBe(1);
});

test('뒤로와 앞으로 가기가 페이지를 복원한다', async ({ page, isMobile }) => {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  if (isMobile) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('navigation', { name: isMobile ? '모바일 메뉴' : '주 메뉴', exact: true }).getByRole('link', { name: '오시는 길', exact: true }).click();
  await expect(page).toHaveURL('/location');
  await page.goBack();
  await expect(page).toHaveURL('/menu');
  await expect(page.getByRole('heading', { level: 1, name: '메뉴소개' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL('/location');
  await expect(page.getByRole('heading', { level: 1, name: '오시는 길' })).toBeVisible();
});

test('Tea 필터는 직접 진입과 새로고침 후 유지된다', async ({ page }) => {
  await page.goto('/menu?category=tea', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('article')).toHaveCount(4);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/menu?category=tea');
  await expect(page.getByRole('button', { name: 'Tea 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('article')).toHaveCount(4);
});

test('없는 경로는 404와 작동하는 홈 링크를 표시한다', async ({ page }) => {
  await page.goto('/no-such-page', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '길을 잃은 잎사귀예요' })).toBeVisible();
  await expect(page).toHaveTitle('페이지를 찾을 수 없어요 · 하루의 잎');
  await page.getByRole('main').getByRole('link', { name: '홈으로', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(routes[0].heading);
});

test('모바일 메뉴는 이동과 Escape로 닫힌다', async ({ page, isMobile, viewport }) => {
  test.skip(!isMobile || !viewport || viewport.width >= 768, '모바일 뷰포트 전용');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await expect(page.getByRole('button', { name: '메뉴 닫기', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const nav = page.getByRole('navigation', { name: '모바일 메뉴', exact: true });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: '메뉴소개', exact: true }).click();
  await expect(page).toHaveURL('/menu');
  await expect(nav).toBeHidden();
  await expect(page.getByRole('button', { name: '메뉴 열기', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
});
