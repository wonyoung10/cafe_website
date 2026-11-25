/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import { PASSWORD, MEMORY_KEY, expect, expectNowhere, logIn, logOut, openAccountMenu, sessionLoginId, signUp, test, uid } from './helpers';

const ID_ERROR = '아이디는 영문과 숫자로 4~20자를 입력해 주세요.';
const PASSWORD_ERROR = '비밀번호는 영문과 숫자로 6자 이상 입력해 주세요.';

async function accountCount(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { accounts: unknown[] }).accounts.length : 0;
  }, MEMORY_KEY);
}

/** 마지막 칸에서 Enter 로 제출한다 (마우스 클릭은 BUG-01 때문에 따로 다룬다). */
async function submitSignupByEnter(page: Page, loginId: string, password: string, confirmation: string) {
  await page.getByLabel('아이디', { exact: true }).fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  const field = page.getByLabel('비밀번호 확인', { exact: true });
  await field.fill(confirmation);
  await field.press('Enter');
}

async function fillSignup(page: Page, loginId: string, password: string, confirmation = password) {
  await page.getByLabel('아이디', { exact: true }).fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(confirmation);
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
}

test.describe('회원가입 규칙 (AU-01~05, AU-07)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: '회원가입', exact: true })).toBeVisible();
  });

  test('AU-02 아이디 3자는 거부되고 오류가 아이디 칸에 연결된다', async ({ page }) => {
    await fillSignup(page, 'abc', PASSWORD);
    const field = page.getByLabel('아이디', { exact: true });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toBeFocused();
    await expect(field).toHaveAccessibleDescription(new RegExp(ID_ERROR));
    await expect(page.getByRole('alert').filter({ hasText: ID_ERROR })).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
    expect(await accountCount(page)).toBe(0);
  });

  test('AU-02 아이디 4자는 가입된다', async ({ page }) => {
    const id = 'ab' + uid('x').slice(-2);
    expect(id).toHaveLength(4);
    await fillSignup(page, id, PASSWORD);
    await expect.poll(() => sessionLoginId(page)).toBe(id);
    await expect(page).not.toHaveURL(/\/signup/);
  });

  for (const [label, bad] of [
    ['한글', '커피커피커피'],
    ['밑줄', 'coffee_12'],
    ['공백', 'cof fee1'],
    ['하이픈', 'coffee-12'],
    ['21자', 'a'.repeat(21)],
  ] as const) {
    test(`AU-04 아이디 규칙: ${label} 거부`, async ({ page }) => {
      await fillSignup(page, bad, PASSWORD);
      await expect(page.getByLabel('아이디', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert').filter({ hasText: ID_ERROR })).toBeVisible();
      expect(await accountCount(page)).toBe(0);
    });
  }

  test('AU-04 아이디 20자는 가입된다', async ({ page }) => {
    const id = uid('t').padEnd(20, 'z');
    expect(id).toHaveLength(20);
    await fillSignup(page, id, PASSWORD);
    await expect.poll(() => sessionLoginId(page)).toBe(id);
  });

  for (const [label, bad] of [
    ['기호', 'abc!12x'],
    ['한글', '비밀번호1234'],
    ['가운데 공백', 'abc 12345'],
    ['앞 공백', ' abc12345'],
    ['뒤 공백', 'abc12345 '],
    ['밑줄', 'abc_12345'],
  ] as const) {
    test(`AU-03 비밀번호는 영문·숫자만: ${label} 거부`, async ({ page }) => {
      await fillSignup(page, uid('p'), bad);
      const field = page.getByLabel('비밀번호', { exact: true });
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toBeFocused();
      await expect(page.getByRole('alert').filter({ hasText: PASSWORD_ERROR })).toBeVisible();
      await expect(page).toHaveURL(/\/signup$/);
      expect(await accountCount(page)).toBe(0);
    });
  }

  test('AU-05 비밀번호 5자는 거부, 영문만 6자와 숫자만 6자는 허용', async ({ page }) => {
    await fillSignup(page, uid('s'), 'ab12c');
    await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    expect(await accountCount(page)).toBe(0);

    const letters = uid('l');
    await fillSignup(page, letters, 'abcdef');
    await expect.poll(() => sessionLoginId(page)).toBe(letters);
    await logOut(page);

    const digits = uid('d');
    await signUp(page, digits, '123456');
  });

  test('AU-05 비밀번호 확인이 다르거나 비어 있으면 가입되지 않는다', async ({ page }) => {
    const confirmation = page.getByLabel('비밀번호 확인', { exact: true });
    await submitSignupByEnter(page, uid('m'), PASSWORD, PASSWORD + 'x');
    await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
    await expect(confirmation).toBeFocused();
    await expect(page.getByRole('alert').filter({ hasText: '같은 비밀번호를 한 번 더 입력해 주세요.' })).toBeVisible();
    expect(await accountCount(page)).toBe(0);

    await confirmation.fill('');
    await confirmation.press('Enter');
    await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
    await expect(confirmation).toBeFocused();
    expect(await accountCount(page)).toBe(0);
  });

  // BUG-01: 확인 칸에 틀린 값을 쓰고 곧바로 버튼을 누르면 mousedown 에서 blur 오류가 생겨 버튼이 아래로 밀리고,
  // mouseup 이 버튼 밖에서 일어나 첫 클릭이 사라진다 (제출도 초점 이동도 일어나지 않는다).
  test('BUG-01 틀린 확인 값을 쓴 직후 한 번 클릭하면 제출되고 확인 칸으로 초점이 간다', async ({ page }) => {
    test.fail(true, 'BUG-01: blur 오류가 버튼을 밀어 첫 클릭이 사라진다');
    await fillSignup(page, uid('m'), PASSWORD, PASSWORD + 'x');
    await expect(page.getByLabel('비밀번호 확인', { exact: true })).toBeFocused({ timeout: 2000 });
  });

  test('AU-04 대소문자만 다른 아이디는 같은 아이디로 보고 가입을 막는다', async ({ page }) => {
    const id = uid('Ab');
    await fillSignup(page, id, PASSWORD);
    await expect.poll(() => sessionLoginId(page)).toBe(id);
    await logOut(page);

    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await fillSignup(page, id.toUpperCase(), PASSWORD);
    await expect(page.getByRole('alert').filter({ hasText: '이미 사용 중인 아이디예요.' })).toBeVisible();
    await expect(page.getByLabel('아이디', { exact: true })).toBeFocused();
    expect(await accountCount(page)).toBe(1);

    // 같은 아이디는 대소문자를 바꿔 써도 로그인된다
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('아이디', { exact: true }).fill(id.toLowerCase());
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect.poll(() => sessionLoginId(page)).toBe(id);
  });

  test('AU-07 가입 화면은 다른 곳에서 쓰는 비밀번호를 피하라고 안내한다', async ({ page }) => {
    await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAccessibleDescription(/다른 곳에서 쓰는 비밀번호는 피해 주세요/);
  });

  test('가입 버튼을 두 번 눌러도 계정은 하나만 생긴다', async ({ page }) => {
    await page.getByLabel('아이디', { exact: true }).fill(uid('dbl'));
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByLabel('비밀번호 확인', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '회원가입', exact: true }).dblclick();
    await expect.poll(() => accountCount(page)).toBe(1);
    await page.waitForTimeout(300);
    expect(await accountCount(page)).toBe(1);
  });

  test('AU-07 비밀번호를 보이게 바꿔도 주소·화면 글·저장소에는 남지 않는다', async ({ page }) => {
    const id = uid('pw');
    const secret = 'Zx9QwErTy7';
    await page.getByLabel('비밀번호', { exact: true }).fill(secret);
    await page.getByRole('button', { name: '비밀번호 보기', exact: true }).click();
    await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'text');
    await expectNowhere(page, secret, '입력 중');
    await fillSignup(page, id, secret);
    await expect.poll(() => sessionLoginId(page)).toBe(id);
    await expectNowhere(page, secret, '가입 직후');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectNowhere(page, secret, '새로고침 뒤');
  });
});

test.describe('로그인·로그아웃·새로고침 (AU-01, AU-06)', () => {
  test('가입 → 새로고침해도 로그인 유지 → 로그아웃 → 다시 로그인', async ({ page }) => {
    const id = uid('keep');
    await signUp(page, id);
    await expect(page.getByRole('heading', { level: 1, name: '당신의 하루에, 잎사귀 하나.' })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const menu = await openAccountMenu(page);
    await expect(menu.getByText(id).filter({ visible: true })).toHaveCount(1);
    await expect(menu.getByRole('link', { name: '로그인', exact: true })).toHaveCount(0);

    // 보호된 화면에서 새로고침해도 로그인 화면으로 튕기지 않는다
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: '주문 내역', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/orders$/);

    await logOut(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await sessionLoginId(page)).toBeNull();
    if (page.viewportSize() && page.viewportSize()!.width < 768) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    await expect(page.getByRole('link', { name: '로그인', exact: true }).first()).toBeVisible();

    await logIn(page, id);
    await expect(page).toHaveURL(/\/$/);
  });

  test('로그아웃하면 보호된 주소는 로그인 화면으로 보내고, 로그인하면 원래 주소로 돌아온다', async ({ page }) => {
    const id = uid('back');
    await signUp(page, id);
    await logOut(page);
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Forders$/);
    await expect(page.getByRole('heading', { level: 1, name: '로그인', exact: true })).toBeVisible();
    await page.getByLabel('아이디', { exact: true }).fill(id);
    await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole('heading', { level: 1, name: '주문 내역', exact: true })).toBeVisible();
  });

  test('틀린 비밀번호와 없는 아이디는 같은 문구로 알리고, 비밀번호는 어디에도 남지 않는다', async ({ page }) => {
    const id = uid('wrong');
    await signUp(page, id);
    await logOut(page);

    const attempt = async (loginId: string, password: string) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('아이디', { exact: true }).fill(loginId);
      await page.getByLabel('비밀번호', { exact: true }).fill(password);
      // 엔터로 제출해도 비밀번호가 주소로 나가지 않는다
      await page.getByLabel('비밀번호', { exact: true }).press('Enter');
      const alert = page.getByRole('alert').filter({ hasText: '아이디와 비밀번호를 다시 확인해 주세요.' });
      await expect(alert).toBeVisible();
      await expect(page.getByLabel('아이디', { exact: true })).toBeFocused();
      await expect(page.getByLabel('아이디', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expectNowhere(page, password, '로그인 실패 뒤');
      return alert.innerText();
    };
    const wrongPassword = await attempt(id, 'WrongPw1234');
    const unknownUser = await attempt(uid('nobody'), 'WrongPw1234');
    expect(wrongPassword).toBe(unknownUser);
    expect(await sessionLoginId(page)).toBeNull();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('로그인 화면의 빈 칸은 안내하고 제출하지 않는다', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByLabel('아이디', { exact: true })).toBeFocused();
    await expect(page.getByRole('alert').filter({ hasText: '아이디를 입력해 주세요.' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: '비밀번호를 입력해 주세요.' })).toBeVisible();
  });

  test('로그인한 사람이 /login 이나 /signup 에 가면 홈으로 보낸다', async ({ page }) => {
    await signUp(page, uid('again'));
    for (const path of ['/login', '/signup']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/$/);
    }
  });

  for (const next of ['https://evil.example/x', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)', '/login', '/signup']) {
    test(`next=${next} 는 밖으로 나가지 않고 홈으로 간다`, async ({ page, baseURL }) => {
      const id = uid('nx');
      await signUp(page, id);
      await logOut(page);
      await page.goto('/login?next=' + encodeURIComponent(next), { waitUntil: 'domcontentloaded' });
      await page.getByLabel('아이디', { exact: true }).fill(id);
      await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      await expect.poll(() => sessionLoginId(page)).toBe(id);
      await expect(page).toHaveURL(`${baseURL}/`);
    });
  }

  test('로그인↔회원가입 링크는 next 를 유지한다', async ({ page }) => {
    await page.goto('/login?next=%2Fcheckout', { waitUntil: 'domcontentloaded' });
    await page.getByRole('main').getByRole('link', { name: '회원가입', exact: true }).click();
    await expect(page).toHaveURL(/\/signup\?next=%2Fcheckout$/);
  });
});
