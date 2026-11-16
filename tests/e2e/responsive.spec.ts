import { expect, test } from './fixtures';

for (const path of ['/', '/menu', '/store', '/location', '/no-such-page']) {
  test(`${path} 페이지에 가로 넘침이 없다`, async ({ page, isMobile }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const hamburger = page.getByRole('button', { name: '메뉴 열기', exact: true });
    if (isMobile) await expect(hamburger).toBeVisible();
    else await expect(hamburger).toBeHidden();
    // Mount the lazy preview before measuring the lower sections.
    if (path === '/') {
      const preview = page.getByRole('region', { name: '햇살이 머무는 공간을 먼저 걸어보세요.' });
      await preview.scrollIntoViewIfNeeded();
      await expect(preview.locator('canvas')).toBeVisible({ timeout: 30_000 });
    }
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
