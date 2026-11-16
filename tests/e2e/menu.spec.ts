import { expect, test } from './fixtures';

test('전체와 각 카테고리의 개수, 선택 상태, URL을 동기화한다', async ({ page }) => {
  await page.goto('/menu?source=qa', { waitUntil: 'domcontentloaded' });
  const filters = page.getByRole('group', { name: '메뉴 카테고리' });
  await expect(page.getByRole('article')).toHaveCount(23);
  await expect(filters.getByRole('button', { name: '전체 23', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const [category, name, count] of [
    ['coffee', 'Coffee', 8], ['non-coffee', 'Non-Coffee', 6], ['tea', 'Tea', 4], ['dessert', 'Dessert', 5], ['all', '전체', 23],
  ] as const) {
    const button = filters.getByRole('button', { name: `${name} ${count}`, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(filters.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByRole('article')).toHaveCount(count);
    const url = new URL(page.url());
    expect(url.searchParams.get('category')).toBe(category === 'all' ? null : category);
    expect(url.searchParams.get('source')).toBe('qa');
    await expect(page.getByRole('status')).toHaveText(`${count}개의 메뉴`);
    if (category === 'dessert') await expect(page.getByRole('article').getByText(/^(HOT|ICE)$/)).toHaveCount(0);
  }
});

test('뒤로 가면 이전 필터로 돌아간다', async ({ page }) => {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Coffee 8', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(8);
  await page.getByRole('button', { name: 'Tea 4', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(4);
  await page.goBack();
  await expect(page).toHaveURL('/menu?category=coffee');
  await expect(page.getByRole('article')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Coffee 8', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('앞의 네 메뉴 사진이 실제로 로드된다', async ({ page }) => {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(23);
  for (let i = 0; i < 4; i++) {
    const image = cards.nth(i).getByRole('img');
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
  }
});
