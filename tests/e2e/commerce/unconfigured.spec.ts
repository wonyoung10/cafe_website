/// <reference lib="dom" />
import { MEMORY_KEY, expect, test } from './helpers';

// 기본 빌드(VITE_COMMERCE_BACKEND 없음, Supabase 키 없음)는 소개 사이트로 그대로 동작하고
// 회원·구매·리뷰 화면은 준비 안내만 보여 준다. 이 스펙은 기본 빌드(4173)에서 실행된다.
// .env.local 에 Supabase 키가 있어도 playwright.config 가 빈 값으로 덮어써 같은 조건을 만든다.

test('회원·구매·리뷰 화면은 서비스 준비 안내를 보여 주고 폼을 그리지 않는다', async ({ page }) => {
  for (const [path, heading] of [['/login', '로그인'], ['/signup', '회원가입'], ['/cart', '장바구니'], ['/reviews', '리뷰 모아보기']] as const) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
    await expect(page.getByText('서비스를 준비하고 있어요. 잠시 후 다시 방문해 주세요.')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  }
});

test('메뉴 카드에는 담기 버튼이 없고, 헤더에는 리뷰 항목이 있다', async ({ page }) => {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('article')).toHaveCount(23);
  await expect(page.getByRole('button', { name: '담기', exact: true })).toHaveCount(0);
  const narrow = (page.viewportSize()?.width ?? 1440) < 768;
  if (narrow) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  const nav = page.getByRole('navigation', { name: narrow ? '모바일 메뉴' : '주 메뉴', exact: true });
  await expect(nav.locator('ul').getByRole('link')).toHaveText(['메뉴소개', '매장', '오시는 길', '리뷰']);
});

test('운영 번들에는 메모리 백엔드가 들어 있지 않고, 저장소에도 흔적이 없다', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') scripts.push(response.url());
  });
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.goto('/menu', { waitUntil: 'networkidle' });
  expect(scripts.length).toBeGreaterThan(0);
  for (const url of scripts) {
    const body = await (await page.request.get(url)).text();
    expect(body.includes('haru-leaf:memory'), `${url} 에 메모리 백엔드 저장소 키가 있다`).toBe(false);
    expect(body.includes('service_role'), `${url} 에 service_role 문자열이 있다`).toBe(false);
  }
  expect(await page.evaluate((key) => localStorage.getItem(key), MEMORY_KEY)).toBeNull();
});
