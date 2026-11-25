/// <reference lib="dom" />
import { crc32, deflateSync } from 'node:zlib';
import type { Locator, Page } from '@playwright/test';
import { expect, test as base } from '../fixtures';

export { expect };

/** 영문·숫자 6자 이상 (AU-03·AU-05 규칙을 만족하는 평범한 비밀번호) */
export const PASSWORD = 'Leaf2026pw';
export const MEMORY_KEY = 'haru-leaf:memory';

const ALLOWED_EXTERNAL_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net', // Pretendard 글꼴
  'openstreetmap.org', // /location 지도 iframe
];
const PAYMENT_HOST_PATTERN =
  /toss|tosspayments|kakaopay|iamport|portone|stripe|paypal|naverpay|nicepay|inicis|kcp|danal|payco|samsungpay|applepay|braintree|adyen|paddle|checkout\.com/i;

let counter = 0;

/** 테스트마다 다른 아이디(영문 소문자·숫자, 20자 이하). 같은 브라우저 저장소를 쓰는 두 사용자도 겹치지 않는다. */
export function uid(prefix = 'u'): string {
  const tail = `${process.pid.toString(36)}${Date.now().toString(36).slice(-4)}${(counter++).toString(36)}`;
  return `${prefix.slice(0, 6)}${tail}`.slice(0, 20);
}

export interface NetworkAudit {
  /** 앱 출처가 아닌 곳으로 나간 요청 URL */
  external: string[];
  /** GET·HEAD가 아닌 요청 */
  writes: string[];
  all: string[];
}

/**
 * 모든 commerce 테스트에 자동으로 붙는 검사.
 * - 결제사 주소로 가는 요청이 없다 (SH-06)
 * - 허용 목록(글꼴·지도)이 아닌 외부 호스트로 나가는 요청이 없다
 * - 앱 출처로 가는 쓰기 요청(POST 등)이 없다 (카드 번호 등을 보내는 일이 없다)
 * 콘솔 오류·pageerror는 기본 fixture(browserErrors)가 이미 0건을 확인한다.
 */
export const test = base.extend<{ network: NetworkAudit }>({
  network: [async ({ context, baseURL }, run) => {
    const origin = new URL(baseURL ?? 'http://localhost:4183').origin;
    const audit: NetworkAudit = { external: [], writes: [], all: [] };
    context.on('request', (request) => {
      let url: URL;
      try { url = new URL(request.url()); } catch { return; }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      audit.all.push(`${request.method()} ${url.origin}${url.pathname}`);
      if (url.origin !== origin) audit.external.push(url.origin + url.pathname);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) audit.writes.push(`${request.method()} ${request.url()}`);
    });
    await run(audit);
    const unexpected = audit.external.filter((href) => {
      const host = new URL(href).hostname;
      return !ALLOWED_EXTERNAL_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
    });
    expect(audit.all.filter((line) => PAYMENT_HOST_PATTERN.test(new URL(line.split(' ')[1] ?? 'http://x').hostname)), '결제사 호스트로 간 요청').toEqual([]);
    expect(unexpected, '허용 목록에 없는 외부 요청').toEqual([]);
    expect(audit.writes, 'GET이 아닌 요청').toEqual([]);
  }, { auto: true }],
});

// ---------------------------------------------------------------------------
// 화면 도우미

export function isNarrow(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768;
}

/** 계정 동작(주문 내역·내 리뷰·로그아웃)이 들어 있는 영역을 열어서 돌려준다. 데스크톱은 '내 계정', 좁은 화면은 햄버거 패널. */
export async function openAccountMenu(page: Page): Promise<Locator> {
  if (isNarrow(page)) {
    const opener = page.getByRole('button', { name: '메뉴 열기', exact: true });
    if (await opener.isVisible()) await opener.click();
    return page.getByRole('navigation', { name: '모바일 메뉴', exact: true });
  }
  const trigger = page.getByRole('button', { name: /^내 계정/ });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  return page.getByRole('banner');
}

export async function sessionLoginId(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const db = JSON.parse(raw) as { session: string | null; accounts: { id: string; loginId: string }[] };
    return db.accounts.find((account) => account.id === db.session)?.loginId ?? null;
  }, MEMORY_KEY);
}

async function submitCredentials(page: Page, loginId: string, password: string, confirmation?: string) {
  await page.getByLabel('아이디', { exact: true }).fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  if (confirmation !== undefined) await page.getByLabel('비밀번호 확인', { exact: true }).fill(confirmation);
  await page.getByRole('button', { name: confirmation !== undefined ? '회원가입' : '로그인', exact: true }).click();
}

/** 회원가입 화면에서 가입한다. 성공하면 요청한 경로(기본 홈)로 이동한 상태가 된다. */
export async function signUp(page: Page, loginId: string, password = PASSWORD, path = '/signup') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '회원가입', exact: true })).toBeVisible();
  await submitCredentials(page, loginId, password, password);
  await expect.poll(() => sessionLoginId(page)).toBe(loginId);
  await expect(page.getByRole('heading', { level: 1, name: '회원가입', exact: true })).toHaveCount(0);
}

export async function logIn(page: Page, loginId: string, password = PASSWORD, path = '/login') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '로그인', exact: true })).toBeVisible();
  await submitCredentials(page, loginId, password);
  await expect.poll(() => sessionLoginId(page)).toBe(loginId);
  await expect(page.getByRole('heading', { level: 1, name: '로그인', exact: true })).toHaveCount(0);
}

export async function logOut(page: Page) {
  const menu = await openAccountMenu(page);
  await menu.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect.poll(() => sessionLoginId(page)).toBeNull();
}

/** 메뉴 카드 하나 */
export function menuCard(page: Page, name: string): Locator {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
}

/** /menu 에서 메뉴를 담는다. 온도를 고를 수 있는 메뉴는 temperature('HOT' | 'ICE')를 눌러 고른다. */
export async function addToCart(page: Page, name: string, temperature?: 'HOT' | 'ICE') {
  if (!new URL(page.url()).pathname.startsWith('/menu')) {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  }
  const card = menuCard(page, name);
  await card.scrollIntoViewIfNeeded();
  if (temperature) await card.locator('label', { hasText: temperature }).click();
  await card.getByRole('button', { name: '담기', exact: true }).click();
  await expect(card.getByRole('status')).toContainText('장바구니에 담았어요');
}

export async function expectCartCount(page: Page, count: number) {
  await expect(page.getByRole('banner').getByRole('link', { name: /^장바구니,/ })).toHaveAccessibleName(`장바구니, ${count}개`);
}

export type Receive = 'takeout' | 'dine-in';
export type Pay = 'onsite' | 'online';
export const receiveLabel: Record<Receive, string> = { takeout: '테이크아웃', 'dine-in': '매장에서' };
export const payLabel: Record<Pay, string> = { onsite: '현장 결제', online: '온라인 결제' };

/** 온라인 결제의 결제 버튼 ('14,100원 결제하기') */
export function payButton(page: Page): Locator {
  return page.getByRole('button', { name: /원 결제하기$/ });
}

/** 열린 결제창에서 인증을 요청하고 앱 인증까지 누른다 */
export async function authorizePayment(page: Page) {
  const dialog = page.getByRole('dialog', { name: '하루의 잎 결제' });
  await dialog.getByRole('button', { name: '인증 요청하기', exact: true }).click();
  await dialog.getByRole('button', { name: '인증하고 결제하기', exact: true }).click();
}

/** 온라인 결제는 승인 처리·완료를 약 3초 보여 주므로 주문 화면을 기본 5초보다 오래 기다린다 */
export const ORDER_URL = /\/orders\/[^/]+$/;
export const ORDER_WAIT = { timeout: 15_000 };

/** /checkout 에서 방법을 고르고 주문한다. 주문 상세로 이동한 뒤 주문 id를 돌려준다. */
export async function checkout(page: Page, receive: Receive, pay: Pay): Promise<string> {
  if (new URL(page.url()).pathname !== '/checkout') await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(receiveLabel[receive], { exact: true }).check();
  await page.getByLabel(payLabel[pay], { exact: true }).check();
  if (pay === 'online') {
    await page.getByLabel('나이테카드', { exact: true }).check();
    await payButton(page).click();
    await authorizePayment(page);
  } else await page.getByRole('button', { name: '주문하기', exact: true }).click();
  await expect(page).toHaveURL(ORDER_URL, ORDER_WAIT);
  return orderIdFromUrl(page);
}

export function orderIdFromUrl(page: Page): string {
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) throw new Error('주문 id가 주소에 없다: ' + page.url());
  return id;
}

/** 가입한 회원이 메뉴를 담아 현장 결제로 주문한다. 주문 id를 돌려준다. */
export async function orderAs(page: Page, items: { name: string; temperature?: 'HOT' | 'ICE' }[], receive: Receive = 'takeout', pay: Pay = 'onsite') {
  await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  for (const item of items) await addToCart(page, item.name, item.temperature);
  return checkout(page, receive, pay);
}

const MENU_ID: Record<string, string> = {
  에스프레소: 'espresso', 아메리카노: 'americano', 카페라떼: 'cafe-latte', 크루아상: 'croissant', 쿠키: 'cookie', 스콘: 'scone',
  '카라멜 마키아토': 'caramel-macchiato', 치즈케이크: 'cheesecake', 휘낭시에: 'financier',
};
export function menuId(name: string): string {
  const id = MENU_ID[name];
  if (!id) throw new Error('menuId 표에 없는 메뉴: ' + name);
  return id;
}

export interface ReviewPayload { rating: number; text: string; photo?: { name: string; mimeType: string; buffer: Buffer } }

/** 리뷰 쓰기 화면에서 별점·글(·사진)을 채우고 저장한다. 목록으로 돌아올 때까지 기다린다. */
export async function writeReview(page: Page, orderId: string, menu: string, review: ReviewPayload) {
  await page.goto(`/reviews/new?order=${orderId}&menu=${menuId(menu)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '리뷰 쓰기', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: new RegExp(`^${review.rating}점`) }).check();
  await page.getByRole('textbox', { name: '리뷰', exact: true }).fill(review.text);
  if (review.photo) {
    await page.locator('#review-photo').setInputFiles(review.photo);
    await expect(page.getByAltText('고른 사진 미리보기')).toBeVisible();
  }
  await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
  await expect(page).toHaveURL(/\/reviews\?mine=1/);
  // 목록 화면이 안내 문구를 받은 뒤 기록에서 지울 때까지 기다린다 (그 사이 머리글이 다시 그려져 열어 둔 메뉴가 닫힐 수 있다)
  await expect.poll(() => page.evaluate(() => (history.state as { usr?: { reviewNotice?: string } } | null)?.usr?.reviewNotice ?? null)).toBeNull();
}

/** 리뷰 목록의 글 하나 */
export function reviewEntry(page: Page, text: string | RegExp): Locator {
  return page.getByRole('article').filter({ hasText: text });
}

// ---------------------------------------------------------------------------
// 검사 도우미

/** 문서에서 폭이 화면을 넘는 요소와 가로 스크롤 여부 */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const doc = document.documentElement;
    const offenders: string[] = [];
    const clipped = (element: Element) => {
      for (let node = element.parentElement; node && node !== document.body && node !== doc; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'visible' && node.getBoundingClientRect().right <= width + 1) return true;
      }
      return false;
    };
    for (const element of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (element.closest('[hidden]') || element.closest('.sr-only')) continue;
      if (rect.right > width + 1 && !clipped(element)) {
        offenders.push(`${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? '.' + element.className.split(' ').slice(0, 3).join('.') : ''} right=${Math.round(rect.right)}`);
        if (offenders.length >= 6) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, bodyScrollWidth: document.body.scrollWidth, innerWidth: width, offenders };
  });
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  await expect.poll(async () => {
    const { scrollWidth, bodyScrollWidth, innerWidth } = await horizontalOverflow(page);
    return Math.max(scrollWidth, bodyScrollWidth) <= innerWidth + 1;
  }, { message: `${label}: 가로 스크롤`, timeout: 5000 }).toBe(true);
  const { offenders } = await horizontalOverflow(page);
  expect(offenders, `${label}: 화면 오른쪽 밖으로 나간 요소`).toEqual([]);
}

/** 화면에 보이는 글과 HTML, 주소, 저장소 어디에도 비밀 값이 없다 */
export async function expectNowhere(page: Page, secret: string, where = '') {
  expect(page.url(), `${where} URL`).not.toContain(secret);
  const found = await page.evaluate((value) => ({
    text: document.body.innerText.includes(value),
    html: document.documentElement.outerHTML.includes(value),
    storage: Object.keys(localStorage).some((key) => (localStorage.getItem(key) ?? '').includes(value))
      || Object.keys(sessionStorage).some((key) => (sessionStorage.getItem(key) ?? '').includes(value)),
    cookie: document.cookie.includes(value),
  }), secret);
  expect(found, `${where} 에 비밀 값이 남아 있다`).toEqual({ text: false, html: false, storage: false, cookie: false });
}

/** Tab을 눌러 대상에 초점이 올 때까지 간다. 못 가면 실패 (키보드로 닿을 수 있다는 증거). */
export async function tabTo(page: Page, target: Locator, max = 80) {
  await expect(target, '키보드로 가려는 대상이 화면에 있어야 한다').toBeAttached({ timeout: 5000 });
  for (let step = 0; step < max; step++) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) return step;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab ${max}번 안에 대상에 닿지 못했다: ${target}`);
}

// ---------------------------------------------------------------------------
// 사진 만들기

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 단색 PNG (진짜 PNG 바이트) */
export function solidPng(width = 64, height = 48, [r, g, b] = [60, 120, 70]): Buffer {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** 브라우저 캔버스로 JPEG·WebP를 만든다 (노드에는 인코더가 없다) */
export async function canvasImage(page: Page, type: 'image/jpeg' | 'image/webp', width = 64, height = 48): Promise<Buffer> {
  const base64 = await page.evaluate(async ({ type, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas 2d 없음');
    context.fillStyle = '#4a7c59';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#e8d9b5';
    context.fillRect(8, 8, width / 2, height / 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    if (!blob || blob.type !== type) throw new Error(`${type} 인코딩 실패`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, { type, width, height });
  return Buffer.from(base64, 'base64');
}

/** GIF89a 1x1 (진짜 GIF 바이트) */
export const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
