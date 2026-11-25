/// <reference lib="dom" />
import type { Locator, Page } from '@playwright/test';
import {
  GIF, canvasImage, expect, logOut, menuId, sessionLoginId, orderAs, reviewEntry, signUp, solidPng, test, uid, writeReview,
  type ReviewPayload,
} from './helpers';

const png = () => ({ name: 'leaf.png', mimeType: 'image/png', buffer: solidPng() });

/** 가입 → 메뉴 주문 → 리뷰 작성까지 마치고 주문 id를 돌려준다 */
async function memberWithReviews(
  page: Page,
  loginId: string,
  items: { name: string; temperature?: 'HOT' | 'ICE' }[],
  reviews: ({ menu: string } & ReviewPayload)[],
) {
  await signUp(page, loginId);
  const orderId = await orderAs(page, items);
  for (const { menu, ...review } of reviews) await writeReview(page, orderId, menu, review);
  return orderId;
}

function mask(loginId: string) {
  return loginId.slice(0, -2) + '**';
}

async function openNewReview(page: Page, orderId: string, menu: string) {
  await page.goto(`/reviews/new?order=${orderId}&menu=${menuId(menu)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: '리뷰 쓰기', exact: true })).toBeVisible();
}

/** 필터의 <select>. label 안에 옵션 글자가 함께 들어 있어 이름이 정확히 일치하지 않으므로 라벨 글자로 찾는다 */
function filterSelect(page: Page, label: '메뉴' | '정렬'): Locator {
  return page.locator('label').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) }).locator('select');
}

function photoError(page: Page): Locator {
  return page.locator('#review-photo-error');
}

async function imageLoaded(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
}

test.describe('리뷰 모아보기 /reviews (RV-02, RV-09)', () => {
  test('로그인 없이 열리고, 지어낸 리뷰 없이 빈 상태를 안내한다', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: '리뷰 모아보기', exact: true })).toBeVisible();
    await expect(page).toHaveTitle(/리뷰 모아보기/);
    await expect(page.getByText('아직 남겨진 리뷰가 없어요.')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '메뉴 보러 가기', exact: true })).toBeVisible();
    expect(await page.evaluate(() => /님이 올린|★/.test(document.body.innerText))).toBe(false);
  });

  test('헤더의 네 번째 항목 리뷰로 이동하고 현재 위치로 표시된다', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
    const narrow = (page.viewportSize()?.width ?? 1440) < 768;
    if (narrow) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    const nav = page.getByRole('navigation', { name: narrow ? '모바일 메뉴' : '주 메뉴', exact: true });
    await expect(nav.locator('ul').getByRole('link')).toHaveText(['메뉴소개', '매장', '오시는 길', '리뷰']);
    await nav.getByRole('link', { name: '리뷰', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews$/);
    if (narrow) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    await expect(nav.getByRole('link', { name: '리뷰', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('비로그인으로 내 리뷰만 보려 하면 로그인 안내로 보낸다', async ({ page }) => {
    await page.goto('/reviews?mine=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('로그인하면 내 리뷰를 볼 수 있어요.')).toBeVisible();
    const login = page.getByRole('main').getByRole('link', { name: '로그인하기', exact: true });
    await expect(login).toHaveAttribute('href', '/login?next=%2Freviews%3Fmine%3D1');
  });

  test('내 리뷰가 없으면 그 상태에 맞는 안내가 나온다', async ({ page }) => {
    await signUp(page, uid('emp'));
    await page.goto('/reviews?mine=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('아직 쓴 리뷰가 없어요.')).toBeVisible();
    await page.goto('/reviews?menu=cookie', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('쿠키 리뷰는 아직 없어요.')).toBeVisible();
    await page.goto('/reviews?menu=cookie&mine=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('쿠키에 쓴 내 리뷰가 없어요.')).toBeVisible();
  });
});

test.describe('구매한 메뉴에만 리뷰를 쓴다 (RV-01, RV-06)', () => {
  test('주문이 없는 회원은 리뷰 쓰기 화면에서 폼을 받지 못한다', async ({ page }) => {
    await signUp(page, uid('nob'));
    for (const url of ['/reviews/new', '/reviews/new?order=00000000-0000-0000-0000-000000000000&menu=espresso', '/reviews/new?order=zzz&menu=nope']) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('리뷰를 쓸 주문을 찾을 수 없어요.')).toBeVisible();
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expect(page.getByRole('link', { name: '주문 내역 보기', exact: true })).toBeVisible();
    }
  });

  test('주문에 없는 메뉴는 거절하고, 주문 상세에는 산 메뉴의 리뷰 링크만 있다', async ({ page }) => {
    await signUp(page, uid('buy'));
    const orderId = await orderAs(page, [{ name: '아메리카노', temperature: 'ICE' }, { name: '크루아상' }]);
    const links = page.getByRole('region', { name: '메뉴 리뷰' }).getByRole('link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAccessibleName('아메리카노 리뷰 쓰기');
    await expect(links.nth(1)).toHaveAccessibleName('크루아상 리뷰 쓰기');
    await expect(links.nth(0)).toHaveAttribute('href', `/reviews/new?order=${orderId}&menu=americano`);

    await page.goto(`/reviews/new?order=${orderId}&menu=cookie`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('이 주문에 없는 메뉴예요.')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });

  test('이미 리뷰를 쓴 주문·메뉴는 수정으로 안내하고, 주문 상세도 수정 링크로 바뀐다', async ({ page }) => {
    const id = uid('dup');
    const orderId = await memberWithReviews(page, id, [{ name: '아메리카노', temperature: 'ICE' }], [{ menu: '아메리카노', rating: 4, text: '한 번만 쓸 수 있어요' }]);
    await page.goto(`/reviews/new?order=${orderId}&menu=americano`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('이 주문의 아메리카노 리뷰는 이미 썼어요.')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '쓴 리뷰 수정하기', exact: true })).toBeVisible();
    await page.goto(`/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: '아메리카노 리뷰 수정', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '아메리카노 리뷰 쓰기', exact: true })).toHaveCount(0);
  });

  test('두 탭에서 같은 주문·메뉴 리뷰를 동시에 열어도 한 건만 저장된다', async ({ page, context }) => {
    const id = uid('race');
    await signUp(page, id);
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    const other = await context.newPage();
    for (const [tab, text] of [[page, '첫 번째 탭의 리뷰'], [other, '두 번째 탭의 리뷰']] as const) {
      await tab.goto(`/reviews/new?order=${orderId}&menu=cookie`, { waitUntil: 'domcontentloaded' });
      await tab.getByRole('radio', { name: /^4점/ }).check();
      await tab.getByRole('textbox', { name: '리뷰', exact: true }).fill(text);
    }
    await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?mine=1/);
    await other.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
    await expect(other.getByRole('alert').filter({ hasText: '이미 리뷰를 작성한 메뉴예요.' })).toBeVisible();
    // 쓴 글은 지워지지 않고 남아 있다
    await expect(other.getByRole('textbox', { name: '리뷰', exact: true })).toHaveValue('두 번째 탭의 리뷰');
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(1);
    await other.close();
  });
});

test.describe('리뷰 쓰기: 별점·글 필수, 사진 선택 (RV-03, RV-07)', () => {
  test('별점과 글을 비우면 각각 알리고 첫 오류 칸으로 초점을 보낸다', async ({ page }) => {
    await signUp(page, uid('val'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    await openNewReview(page, orderId, '쿠키');
    const save = page.getByRole('button', { name: '리뷰 남기기', exact: true });
    await save.click();
    await expect(page.getByText('별점을 골라 주세요.')).toBeVisible();
    await expect(page.getByRole('radio', { name: /^1점/ })).toBeFocused();
    await expect(page.getByRole('radiogroup', { name: '별점' })).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/reviews\/new/);

    await page.getByRole('radio', { name: /^3점/ }).check();
    await save.click();
    await expect(page.getByText('리뷰를 한 글자 이상 적어 주세요.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: '리뷰', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: '리뷰', exact: true })).toHaveAttribute('aria-invalid', 'true');

    // 공백뿐인 글도 빈 글이다
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('   \n  ');
    await save.click();
    await expect(page.getByText('리뷰를 한 글자 이상 적어 주세요.')).toBeVisible();
    await expect(page).toHaveURL(/\/reviews\/new/);
  });

  test('글자 수는 앞뒤 공백을 빼고 센다: 500자는 저장, 501자는 막힌다', async ({ page }) => {
    await signUp(page, uid('len'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    await openNewReview(page, orderId, '쿠키');
    const text = page.getByRole('textbox', { name: '리뷰', exact: true });
    await page.getByRole('radio', { name: /^5점/ }).check();
    await text.fill('가'.repeat(501));
    await expect(page.getByText('501 / 500')).toBeVisible();
    await expect(page.getByText('500자까지 쓸 수 있어요. 1자를 줄여 주세요.')).toBeVisible();
    await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\/new/);

    await text.fill('  ' + '나'.repeat(500) + '  ');
    await expect(page.getByText('500 / 500')).toBeVisible();
    await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?mine=1/);
    await expect(page.getByRole('article')).toContainText('나'.repeat(500));
  });

  test('사진 없이 남긴 리뷰에는 이미지가 없고, 별점·글·마스킹된 아이디·날짜가 보인다', async ({ page }) => {
    const id = uid('np');
    await signUp(page, id);
    const orderId = await orderAs(page, [{ name: '아메리카노', temperature: 'ICE' }]);
    await writeReview(page, orderId, '아메리카노', { rating: 4, text: '산미가 적어서 편하게 마셨어요' });
    await expect(page.getByRole('status').filter({ hasText: '리뷰를 남겼어요. 고맙습니다.' })).toBeVisible();
    const entry = reviewEntry(page, '산미가 적어서');
    await expect(entry.getByRole('heading', { name: '아메리카노', exact: true })).toBeVisible();
    await expect(entry.getByRole('img', { name: '별점 5점 만점에 4점' })).toBeVisible();
    await expect(entry.getByText(mask(id), { exact: true })).toBeVisible();
    await expect(entry.getByText('내 리뷰', { exact: true })).toBeVisible();
    await expect(entry.locator('time')).toHaveText(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
    expect(await entry.locator('img').count()).toBe(0);
    // 새로고침하면 안내 문구는 사라지고 리뷰는 남는다
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('리뷰를 남겼어요. 고맙습니다.')).toHaveCount(0);
    await expect(reviewEntry(page, '산미가 적어서')).toBeVisible();
  });

  for (const [label, mime] of [['PNG', 'image/png'], ['JPEG', 'image/jpeg'], ['WebP', 'image/webp']] as const) {
    test(`사진 ${label}를 올린 리뷰는 이미지를 그린다`, async ({ page }) => {
      const id = uid('ph');
      await signUp(page, id);
      const orderId = await orderAs(page, [{ name: '스콘' }]);
      const buffer = mime === 'image/png' ? solidPng() : await canvasImage(page, mime);
      await writeReview(page, orderId, '스콘', { rating: 5, text: `${label} 사진을 붙였어요`, photo: { name: `leaf.${label.toLowerCase()}`, mimeType: mime, buffer } });
      const entry = reviewEntry(page, `${label} 사진을 붙였어요`);
      const image = entry.locator('img');
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute('alt', `${mask(id)} 님이 올린 스콘 사진`);
      await imageLoaded(image);
    });
  }

  test('긴 변이 1200px를 넘는 사진은 1200px로 줄어 저장된다', async ({ page }) => {
    await signUp(page, uid('big'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    const buffer = await canvasImage(page, 'image/jpeg', 3000, 2000);
    await writeReview(page, orderId, '쿠키', { rating: 5, text: '큰 사진', photo: { name: 'big.jpg', mimeType: 'image/jpeg', buffer } });
    const image = reviewEntry(page, '큰 사진').locator('img');
    await imageLoaded(image);
    const size = await image.evaluate((element) => (element instanceof HTMLImageElement ? [element.naturalWidth, element.naturalHeight] : [0, 0]));
    expect(size).toEqual([1200, 800]);
  });

  test('GIF와 10MB를 넘는 파일은 거절하고, 사진 없이도 저장할 수 있다', async ({ page }) => {
    await signUp(page, uid('bad'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    await openNewReview(page, orderId, '쿠키');
    const input = page.locator('#review-photo');

    await input.setInputFiles({ name: 'dance.gif', mimeType: 'image/gif', buffer: GIF });
    await expect(photoError(page)).toHaveText('JPG, PNG, WebP 사진을 골라 주세요.');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByAltText('고른 사진 미리보기')).toHaveCount(0);

    await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1) });
    await expect(photoError(page)).toHaveText('10MB 이하 사진을 골라 주세요.');
    await expect(page.getByAltText('고른 사진 미리보기')).toHaveCount(0);

    // 정확히 10MB는 크기 검사를 통과하지만 이미지가 아니므로 읽지 못한다고 안내한다
    await input.setInputFiles({ name: 'limit.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024, 1) });
    await expect(photoError(page)).toHaveText('사진을 읽지 못했어요. 다른 사진을 골라 주세요.');

    await input.setInputFiles({ name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('이것은 사진이 아니에요') });
    await expect(photoError(page)).toHaveText('사진을 읽지 못했어요. 다른 사진을 골라 주세요.');

    await page.getByRole('radio', { name: /^3점/ }).check();
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('사진 없이도 저장돼요');
    await page.getByRole('button', { name: '리뷰 남기기', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?mine=1/);
    expect(await reviewEntry(page, '사진 없이도 저장돼요').locator('img').count()).toBe(0);
  });

  // BUG-05: 사진 오류는 role 이 없는 <p> 라서 사진을 고른 직후(초점이 움직이지 않음) 스크린리더에 알려지지 않는다.
  test('BUG-05 사진 오류는 alert/status 로 알려진다', async ({ page }) => {
    await signUp(page, uid('lv'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    await openNewReview(page, orderId, '쿠키');
    await page.locator('#review-photo').setInputFiles({ name: 'dance.gif', mimeType: 'image/gif', buffer: GIF });
    await expect(photoError(page)).toBeVisible();
    const announced = await photoError(page).evaluate((element) => Boolean(element.closest('[role="alert"], [role="status"], [aria-live]:not([aria-live="off"])')));
    expect(announced).toBe(true);
  });

  test('고른 사진은 미리보기를 보여 주고 빼면 사라진다', async ({ page }) => {
    await signUp(page, uid('prv'));
    const orderId = await orderAs(page, [{ name: '쿠키' }]);
    await openNewReview(page, orderId, '쿠키');
    await page.locator('#review-photo').setInputFiles(png());
    await expect(page.getByAltText('고른 사진 미리보기')).toBeVisible();
    await page.getByRole('button', { name: '사진 빼기', exact: true }).click();
    await expect(page.getByAltText('고른 사진 미리보기')).toHaveCount(0);
    await expect(page.locator('#review-photo')).toBeFocused();
  });
});

test.describe('아이디 가리기 (RV-05)', () => {
  test('끝 두 글자만 **로 바뀌고, 다른 사용자나 비회원 화면 어디에도 원래 아이디가 없다', async ({ page }) => {
    const author = 'Coffee' + uid('x').slice(-4); // 대소문자 섞인 10자
    expect(author).toHaveLength(10);
    await memberWithReviews(page, author, [{ name: '아메리카노', temperature: 'ICE' }, { name: '크루아상' }], [
      { menu: '아메리카노', rating: 5, text: '가린 아이디 확인', photo: png() },
      { menu: '크루아상', rating: 4, text: '두 번째 리뷰' },
    ]);
    const hasRaw = (target: Page) => target.evaluate((raw) => ({
      text: document.body.innerText.includes(raw),
      html: document.documentElement.outerHTML.includes(raw),
      altOrLabel: [...document.querySelectorAll('[alt],[aria-label],[title]')].some((element) => ['alt', 'aria-label', 'title'].some((name) => element.getAttribute(name)?.includes(raw))),
    }), author);

    // 쓴 사람이 보는 화면도 가려져 있다
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByRole('article').getByText(mask(author), { exact: true })).toHaveCount(2);
    expect(mask(author)).toBe(author.slice(0, 8) + '**');

    // 비회원
    await logOut(page);
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByRole('article').getByText(mask(author), { exact: true })).toHaveCount(2);
    await expect(page.getByRole('article').getByRole('button')).toHaveCount(0);
    expect(await hasRaw(page)).toEqual({ text: false, html: false, altOrLabel: false });

    // 다른 회원
    await signUp(page, uid('view'));
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(2);
    expect(await hasRaw(page)).toEqual({ text: false, html: false, altOrLabel: false });
    await page.goto('/reviews?sort=rating-high&menu=americano', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(1);
    expect(await hasRaw(page)).toEqual({ text: false, html: false, altOrLabel: false });
  });

  test('아이디가 4자여도 끝 두 글자만 가린다', async ({ page }) => {
    const id = 'ab' + uid('z').slice(-2);
    await memberWithReviews(page, id, [{ name: '쿠키' }], [{ menu: '쿠키', rating: 3, text: '짧은 아이디' }]);
    await expect(reviewEntry(page, '짧은 아이디').getByText('ab**', { exact: true })).toBeVisible();
  });
});

test.describe('두 사용자, 한 브라우저 (RV-04)', () => {
  test('B는 A의 리뷰를 가려진 아이디로 보지만 수정·삭제는 할 수 없다', async ({ page }) => {
    const a = uid('usera');
    const orderA = await memberWithReviews(page, a, [{ name: '아메리카노', temperature: 'ICE' }], [{ menu: '아메리카노', rating: 5, text: 'A가 쓴 리뷰' }]);
    // A는 자기 리뷰의 수정·삭제 버튼을 본다
    const own = reviewEntry(page, 'A가 쓴 리뷰');
    await expect(own.getByRole('link', { name: '아메리카노 리뷰 수정' })).toBeVisible();
    await expect(own.getByRole('button', { name: '아메리카노 리뷰 삭제' })).toBeVisible();
    const editHref = (await own.getByRole('link', { name: '아메리카노 리뷰 수정' }).getAttribute('href')) ?? '';
    expect(editHref).toMatch(/^\/reviews\/[^/]+\/edit$/);
    await logOut(page);

    const b = uid('userb');
    await signUp(page, b);
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    const seen = reviewEntry(page, 'A가 쓴 리뷰');
    await expect(seen).toBeVisible();
    await expect(seen.getByText(mask(a), { exact: true })).toBeVisible();
    await expect(seen.getByText('내 리뷰', { exact: true })).toHaveCount(0);
    await expect(seen.getByRole('link', { name: /수정/ })).toHaveCount(0);
    await expect(seen.getByRole('button', { name: /삭제/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /리뷰 수정/ })).toHaveCount(0);

    // 내 리뷰만 보기에는 A의 글이 없다
    await page.goto('/reviews?mine=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('아직 쓴 리뷰가 없어요.')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);

    // 주소를 알아도 수정 화면은 열리지 않는다
    await page.goto(editHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('수정할 수 있는 리뷰가 아니에요.')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByText('A가 쓴 리뷰')).toHaveCount(0);

    // A의 주문으로 리뷰를 쓸 수도 없다
    await page.goto(`/reviews/new?order=${orderA}&menu=americano`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('리뷰를 쓸 주문을 찾을 수 없어요.')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);

    // A는 여전히 자기 리뷰를 고칠 수 있다
    await logOut(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('아이디', { exact: true }).fill(a);
    await page.getByLabel('비밀번호', { exact: true }).fill('Leaf2026pw');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect.poll(() => sessionLoginId(page)).toBe(a);
    await page.goto(editHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: '리뷰', exact: true })).toHaveValue('A가 쓴 리뷰');
  });

  test('로그아웃 상태에서 수정 주소나 리뷰 쓰기 주소로 가면 로그인 화면으로 보낸다', async ({ page }) => {
    await page.goto('/reviews/abc/edit', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Freviews%2Fabc%2Fedit$/);
    await page.goto('/reviews/new?order=x&menu=cookie', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Freviews%2Fnew%3Forder%3Dx%26menu%3Dcookie$/);
  });

  test('계정을 바꾸면 이전 계정의 수정·삭제 버튼이 남지 않는다', async ({ page }) => {
    const a = uid('swa');
    await memberWithReviews(page, a, [{ name: '쿠키' }], [{ menu: '쿠키', rating: 4, text: '계정 전환 확인' }]);
    await expect(page.getByRole('button', { name: '쿠키 리뷰 삭제' })).toBeVisible();
    await logOut(page);
    // 내 리뷰만 보던 화면은 로그인 안내로 바뀌고, 이전 계정의 글과 버튼은 남지 않는다
    await expect(page.getByText('로그인하면 내 리뷰를 볼 수 있어요.')).toBeVisible();
    await expect(page.getByRole('button', { name: /리뷰 삭제/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /리뷰 수정/ })).toHaveCount(0);
    await expect(page.getByRole('article')).toHaveCount(0);
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    await expect(reviewEntry(page, '계정 전환 확인')).toBeVisible();
    await expect(page.getByRole('button', { name: /리뷰 삭제/ })).toHaveCount(0);
  });
});

test.describe('리뷰 수정 (RV-04)', () => {
  test('별점·글을 고치면 수정됨 표시와 함께 바뀌고, 그만두면 그대로다', async ({ page }) => {
    await memberWithReviews(page, uid('ed'), [{ name: '아메리카노', temperature: 'ICE' }], [{ menu: '아메리카노', rating: 5, text: '고치기 전 글' }]);
    await page.getByRole('link', { name: '아메리카노 리뷰 수정' }).click();
    await expect(page.getByRole('heading', { level: 1, name: '리뷰 수정', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^5점/ })).toBeChecked();
    await expect(page.getByRole('textbox', { name: '리뷰', exact: true })).toHaveValue('고치기 전 글');

    await page.getByRole('radio', { name: /^2점/ }).check();
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('그만둘 글');
    await page.getByRole('link', { name: '그만두기', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?mine=1/);
    await expect(reviewEntry(page, '고치기 전 글')).toBeVisible();

    await page.getByRole('link', { name: '아메리카노 리뷰 수정' }).click();
    await page.getByRole('radio', { name: /^2점/ }).check();
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('고친 뒤 글');
    await page.getByRole('button', { name: '수정한 리뷰 저장', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?mine=1/);
    await expect(page.getByRole('status').filter({ hasText: '리뷰를 수정했어요.' })).toBeVisible();
    const entry = reviewEntry(page, '고친 뒤 글');
    await expect(entry.getByRole('img', { name: '별점 5점 만점에 2점' })).toBeVisible();
    await expect(entry.getByText('수정됨', { exact: true })).toBeVisible();
    await expect(reviewEntry(page, '고치기 전 글')).toHaveCount(0);
  });

  test('수정 화면에서도 같은 검증이 적용된다', async ({ page }) => {
    await memberWithReviews(page, uid('edv'), [{ name: '쿠키' }], [{ menu: '쿠키', rating: 4, text: '검증용 글' }]);
    await page.getByRole('link', { name: '쿠키 리뷰 수정' }).click();
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('');
    await page.getByRole('button', { name: '수정한 리뷰 저장', exact: true }).click();
    await expect(page.getByText('리뷰를 한 글자 이상 적어 주세요.')).toBeVisible();
    await expect(page).toHaveURL(/\/edit$/);
  });

  test('사진을 빼고, 다시 붙이고, 그대로 두는 세 경우가 모두 동작한다', async ({ page }) => {
    await memberWithReviews(page, uid('edp'), [{ name: '스콘' }], [{ menu: '스콘', rating: 4, text: '사진 수정 확인', photo: png() }]);
    await expect(reviewEntry(page, '사진 수정 확인').locator('img')).toHaveCount(1);

    // 그대로 두고 글만 고친다 → 사진 유지
    await page.getByRole('link', { name: '스콘 리뷰 수정' }).click();
    await expect(page.getByAltText('지금 리뷰에 있는 사진')).toBeVisible();
    await page.getByRole('textbox', { name: '리뷰', exact: true }).fill('사진 수정 확인 유지');
    await page.getByRole('button', { name: '수정한 리뷰 저장', exact: true }).click();
    await expect(reviewEntry(page, '사진 수정 확인 유지').locator('img')).toHaveCount(1);

    // 빼기
    await page.getByRole('link', { name: '스콘 리뷰 수정' }).click();
    await page.getByRole('button', { name: '사진 빼기', exact: true }).click();
    await expect(page.getByAltText('지금 리뷰에 있는 사진')).toHaveCount(0);
    await page.getByRole('button', { name: '수정한 리뷰 저장', exact: true }).click();
    await expect(reviewEntry(page, '사진 수정 확인 유지')).toBeVisible();
    expect(await reviewEntry(page, '사진 수정 확인 유지').locator('img').count()).toBe(0);

    // 다시 붙이기
    await page.getByRole('link', { name: '스콘 리뷰 수정' }).click();
    await page.locator('#review-photo').setInputFiles({ name: 'again.png', mimeType: 'image/png', buffer: solidPng(40, 40, [200, 80, 60]) });
    await expect(page.getByAltText('고른 사진 미리보기')).toBeVisible();
    await page.getByRole('button', { name: '수정한 리뷰 저장', exact: true }).click();
    await imageLoaded(reviewEntry(page, '사진 수정 확인 유지').locator('img'));
  });
});

test.describe('리뷰 삭제 확인 (RV-04, RV-09)', () => {
  async function withOneReview(page: Page, text: string) {
    await memberWithReviews(page, uid('del'), [{ name: '쿠키' }], [{ menu: '쿠키', rating: 4, text }]);
  }

  test('삭제를 누르면 확인 단계가 나오고, 남겨 두기·Esc는 아무것도 지우지 않는다', async ({ page }) => {
    await withOneReview(page, '지우지 않을 글');
    const open = page.getByRole('button', { name: '쿠키 리뷰 삭제', exact: true });
    await open.click();
    const confirm = page.getByRole('group', { name: '쿠키 리뷰 삭제 확인' });
    await expect(confirm).toContainText('이 리뷰를 삭제할까요?');
    await expect(confirm).toContainText('삭제하면 되돌릴 수 없어요.');
    await expect(confirm.getByRole('button', { name: '남겨 두기', exact: true })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(open).toBeFocused();
    await expect(reviewEntry(page, '지우지 않을 글')).toBeVisible();

    await open.click();
    await page.getByRole('button', { name: '남겨 두기', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(open).toBeFocused();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(reviewEntry(page, '지우지 않을 글')).toBeVisible();
  });

  test('삭제하기를 누르면 지워지고 새로고침해도 남지 않으며, 주문 상세에서 다시 쓸 수 있다', async ({ page }) => {
    await withOneReview(page, '지울 글');
    await page.getByRole('button', { name: '쿠키 리뷰 삭제', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '리뷰를 삭제했어요.' })).toBeVisible();
    await expect(reviewEntry(page, '지울 글')).toHaveCount(0);
    await expect(page.getByText('아직 쓴 리뷰가 없어요.')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('아직 쓴 리뷰가 없어요.')).toBeVisible();
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.getByRole('main').getByRole('link', { name: /주문번호/ }).click();
    await expect(page.getByRole('link', { name: '쿠키 리뷰 쓰기', exact: true })).toBeVisible();
  });

  test('이웃 리뷰가 있으면 삭제 뒤 초점이 이웃 리뷰 제목으로 간다', async ({ page }) => {
    await memberWithReviews(page, uid('dn'), [{ name: '쿠키' }, { name: '스콘' }], [
      { menu: '쿠키', rating: 4, text: '첫째 글' },
      { menu: '스콘', rating: 3, text: '둘째 글' },
    ]);
    await expect(page.getByRole('article')).toHaveCount(2);
    await page.getByRole('button', { name: '스콘 리뷰 삭제', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(reviewEntry(page, '첫째 글').getByRole('heading', { name: '쿠키' })).toBeFocused();
  });
});

test.describe('모아보기: 메뉴별·내 리뷰·정렬·평균 (RV-08)', () => {
  test('평균 별점과 개수가 조건에 따라 바뀌고, 조건은 주소에 남는다', async ({ page }) => {
    const a = uid('fa');
    await memberWithReviews(page, a, [{ name: '아메리카노', temperature: 'ICE' }, { name: '크루아상' }], [
      { menu: '아메리카노', rating: 5, text: '다섯 점 글' },
      { menu: '크루아상', rating: 2, text: '두 점 글' },
    ]);
    await logOut(page);
    await memberWithReviews(page, uid('fb'), [{ name: '에스프레소' }], [{ menu: '에스프레소', rating: 4, text: '네 점 글' }]);

    await page.goto('/reviews', { waitUntil: 'domcontentloaded' });
    const summary = page.locator('div[role="status"][aria-atomic="true"]');
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(summary).toContainText('3.7'); // (5+2+4)/3
    await expect(summary).toContainText('리뷰 3개의 평균');
    await expect(summary.getByRole('img', { name: /별점 5점 만점에 3\.7점/ })).toBeVisible();

    // 별점순 정렬
    await filterSelect(page, '정렬').selectOption('rating-high');
    await expect(page).toHaveURL(/sort=rating-high/);
    await expect(page.getByRole('article').first()).toContainText('다섯 점 글');
    await filterSelect(page, '정렬').selectOption('rating-low');
    await expect(page.getByRole('article').first()).toContainText('두 점 글');
    await expect(page.getByRole('article').last()).toContainText('다섯 점 글');

    // 메뉴별
    await filterSelect(page, '메뉴').selectOption('croissant');
    await expect(page).toHaveURL(/menu=croissant/);
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(summary).toContainText('크루아상 리뷰');
    await expect(summary).toContainText('2.0');
    await expect(summary).toContainText('리뷰 1개의 평균');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(filterSelect(page, '메뉴')).toHaveValue('croissant');
    await expect(filterSelect(page, '정렬')).toHaveValue('rating-low');
    await expect(page.getByRole('article')).toHaveCount(1);

    // 알 수 없는 값은 무시한다
    await page.goto('/reviews?menu=nope&sort=weird&mine=yes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(filterSelect(page, '메뉴')).toHaveValue('');
    await expect(filterSelect(page, '정렬')).toHaveValue('latest');

    // 내 리뷰만 (B 로그인 상태)
    await page.getByRole('button', { name: '내 리뷰만', exact: true }).click();
    await expect(page).toHaveURL(/mine=1/);
    await expect(page.getByRole('button', { name: '내 리뷰만', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText('네 점 글');
    await expect(summary).toContainText('내가 쓴 리뷰');

    // 같은 메뉴를 다른 사람도 썼다면 메뉴 필터에서 함께 평균에 들어간다
    await page.goto('/reviews?menu=espresso', { waitUntil: 'domcontentloaded' });
    await expect(summary).toContainText('4.0');
  });
});
