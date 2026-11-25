/// <reference lib="dom" />
import type { ConsoleMessage } from '@playwright/test';
import { PASSWORD, expect, orderAs, signUp, test, uid, writeReview, logOut } from './helpers';

const PUBLIC_PAGES = [
  { path: '/signup', heading: '회원가입' },
  { path: '/login', heading: '로그인' },
  { path: '/cart', heading: '장바구니' },
  { path: '/reviews', heading: '리뷰 모아보기' },
] as const;

const PROTECTED_PAGES = ['/checkout', '/orders', '/orders/abc', '/reviews/new', '/reviews/new?order=a&menu=cookie', '/reviews/abc/edit'] as const;

test.describe('로그인하지 않았을 때 직접 주소로 들어가기', () => {
  for (const { path, heading } of PUBLIC_PAGES) {
    test(`${path} 는 로그인 없이 열린다`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }

  for (const path of PROTECTED_PAGES) {
    test(`${path} 는 로그인 화면으로 보내고, 로그인하면 같은 주소로 돌아온다`, async ({ page, baseURL }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(`${baseURL}/login?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole('heading', { level: 1, name: '로그인', exact: true })).toBeVisible();
      // 보호된 화면의 내용은 로그인 전에 그려지지 않는다
      await expect(page.getByRole('textbox', { name: '리뷰', exact: true })).toHaveCount(0);
      await expect(page.getByRole('region', { name: '주문 요약' })).toHaveCount(0);
    });
  }

  test('로그인 뒤 원래 주소(쿼리 포함)로 돌아온다', async ({ page, baseURL }) => {
    const id = uid('rt');
    await signUp(page, id);
    await logOut(page);
    const target = '/orders/not-found-id?from=qa';
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('아이디', { exact: true }).fill(id);
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}${target}`);
    await expect(page.getByText('주문을 찾을 수 없어요.')).toBeVisible();
  });
});

test('새 화면 전체를 돌아다녀도 콘솔 오류·경고가 없고 요청은 모두 우리 서버다', async ({ page, baseURL }) => {
  const messages: string[] = [];
  const origin = new URL(baseURL ?? '').origin;
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const source = message.location().url;
    if (source && !source.startsWith(origin)) return; // 외부 글꼴 등
    messages.push(`${message.type()}: ${message.text()} (${source})`);
  };
  page.on('console', onConsole);
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });

  const id = uid('sweep');
  for (const { path } of PUBLIC_PAGES) await page.goto(path, { waitUntil: 'networkidle' });
  await signUp(page, id);
  const orderId = await orderAs(page, [{ name: '아메리카노', temperature: 'ICE' }, { name: '스콘' }], 'dine-in', 'online');
  await writeReview(page, orderId, '스콘', { rating: 3, text: '콘솔 확인용' });
  for (const path of ['/cart', '/checkout', '/orders', `/orders/${orderId}`, '/reviews', '/reviews?mine=1', '/reviews?menu=scone&sort=rating-low', `/reviews/new?order=${orderId}&menu=americano`]) {
    await page.goto(path, { waitUntil: 'networkidle' });
  }
  page.off('console', onConsole);
  expect(messages, '콘솔 오류·경고').toEqual([]);
  expect(failed, '4xx/5xx 응답').toEqual([]);
});

test('새 화면은 화면마다 문서 제목이 있다', async ({ page }) => {
  const titled = async (path: string, title: string) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(`${title} · 하루의 잎`);
  };
  await titled('/signup', '회원가입');
  await titled('/login', '로그인');
  await titled('/cart', '장바구니');
  await titled('/reviews', '리뷰 모아보기');
  await signUp(page, uid('ttl'));
  await titled('/checkout', '결제');
  await titled('/orders', '주문 내역');
  await titled('/orders/nope', '주문 상세');
  await titled('/reviews/new', '리뷰 쓰기');
  await titled('/reviews/nope/edit', '리뷰 수정');
});
