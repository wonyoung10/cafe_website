import { expect, test } from '@playwright/test';

test('홈이 열리고 메인 카피가 보인다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('당신의 하루에');
});

test('직접 URL로 진입해도 페이지가 열린다 (SPA fallback)', async ({ page }) => {
  await page.goto('/location');
  await expect(page.getByRole('heading', { level: 1, name: '오시는 길' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '오시는 길' })).toBeVisible();
});
