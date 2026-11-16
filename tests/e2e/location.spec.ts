import { expect, test } from './fixtures';

const address = '경기도 안양시 동안구 경수대로 940';

test('주소를 표시하고 복사 결과를 알려준다', async ({ page, context, baseURL, isMobile, browserName }) => {
  if (!isMobile && browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
  await page.goto('/location', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('main').getByText(address, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '주소 복사', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('주소가 복사되었어요');
  if (!isMobile && browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);
});

test('길찾기 링크는 올바른 호스트를 안전한 새 탭으로 연다', async ({ page }) => {
  await page.goto('/location', { waitUntil: 'domcontentloaded' });
  for (const [name, host] of [['네이버지도에서 길찾기', 'map.naver.com'], ['카카오맵에서 길찾기', 'map.kakao.com']] as const) {
    const link = page.getByRole('link', { name: new RegExp(name) });
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    expect(new URL(href ?? '').hostname).toBe(host);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
    await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
  }
});

test('지도 iframe은 제목과 OpenStreetMap 주소를 갖는다', async ({ page }) => {
  await page.goto('/location', { waitUntil: 'domcontentloaded' });
  const iframe = page.locator('iframe[title="하루의 잎 위치 지도"]');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute('loading', 'lazy');
  const src = await iframe.getAttribute('src');
  expect(src).not.toBeNull();
  expect(new URL(src ?? '').hostname).toBe('www.openstreetmap.org');
  // The remote frame's contents and network availability are intentionally outside this test.
});
