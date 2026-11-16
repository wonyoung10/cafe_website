import { expect, test } from './fixtures';

test('히어로와 대표 메뉴 네 개를 표시한다', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('당신의 하루에, 잎사귀 하나.');
  const featured = page.getByRole('region', { name: '오늘의 잎 한 장을 고르세요.' });
  await expect(featured.getByRole('article')).toHaveCount(4);
  await expect(featured.getByRole('link', { name: '전체 메뉴 보기', exact: true })).toHaveAttribute('href', '/menu');
});

for (const [name, href, heading] of [
  ['메뉴 보기', '/menu', '메뉴소개'], ['전체 메뉴 보기', '/menu', '메뉴소개'],
  ['매장 둘러보기', '/store', '매장'], ['매장 들어가기', '/store', '매장'],
] as const) {
  test(`홈 CTA ${name}가 목적지로 이동한다`, async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const link = page.getByRole('main').getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
  });
}

test('매장 미리보기는 스크롤 진입 후 캔버스를 마운트한다', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const preview = page.getByRole('region', { name: '햇살이 머무는 공간을 먼저 걸어보세요.' });
  await expect(preview.locator('canvas')).toHaveCount(0);
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 30_000 });
});

test('위치 요약에 주소와 오시는 길 링크가 있다', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const summary = page.getByRole('region', { name: '하루의 잎이 자라날 자리.' });
  await expect(summary.getByText('경기도 안양시 동안구 경수대로 940', { exact: true })).toBeVisible();
  await summary.getByRole('link', { name: '오시는 길', exact: true }).click();
  await expect(page).toHaveURL('/location');
  await expect(page.getByRole('heading', { level: 1, name: '오시는 길' })).toBeVisible();
});
