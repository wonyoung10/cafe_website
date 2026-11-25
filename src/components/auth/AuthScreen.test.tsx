import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import { CommerceContext } from '@/contexts/commerce';
import AppRoutes from '@/app/router';
import { createMemoryApi } from '@/services/memoryApi';
import type { SessionUser } from '@/types/commerce';

const secret = 'Maple709';
const member = { id: 'test-member', loginId: 'Leaf' };

function visit(path: string, api = createMemoryApi()) {
  window.history.replaceState(null, '', path);
  return render(<BrowserRouter><AppRoutes api={api} /></BrowserRouter>);
}

async function formFor(name: '회원가입' | '로그인') {
  return within(await screen.findByRole('form', { name }));
}

async function fill(name: '회원가입' | '로그인', id = 'Leaf', password = secret) {
  const form = await formFor(name);
  const user = userEvent.setup();
  await user.type(form.getByLabelText('아이디'), id);
  await user.type(form.getByLabelText('비밀번호'), password);
  if (name === '회원가입') await user.type(form.getByLabelText('비밀번호 확인'), password);
  return { user, form, submit: form.getByRole('button', { name }) };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('회원가입', () => {
  it('AU-02/04 · 입력 전에 규칙을 읽고 탭으로 3자 오류와 4자 허용을 확인한다', async () => {
    visit('/signup');
    const form = await formFor('회원가입');
    const user = userEvent.setup();
    const id = form.getByLabelText('아이디');
    expect(id).toHaveAccessibleDescription(/영문 또는 숫자 4~20자.*대소문자/);
    expect(id).toHaveAttribute('autocomplete', 'username');
    id.focus();
    await user.keyboard('abc{Tab}');
    expect(id).toBeInvalid();
    expect(id).toHaveAccessibleDescription(/4~20자를 입력해 주세요/);
    expect(form.getByLabelText('비밀번호')).toHaveFocus();
    await user.tab({ shift: true });
    await user.keyboard('{End}D{Tab}');
    expect(id).toBeValid();
    expect(id).not.toHaveAccessibleDescription(/입력해 주세요/);
  });

  it.each(['abc!12', '비밀번호1', 'abc 12', '12345'])('AU-03/05 · 허용되지 않는 비밀번호를 제출 전에 설명한다 (%s)', async password => {
    const api = createMemoryApi();
    const signup = vi.spyOn(api.auth, 'signUp');
    visit('/signup', api);
    const { user, form, submit } = await fill('회원가입', 'Leaf', password);
    const field = form.getByLabelText('비밀번호');
    expect(field).toBeInvalid();
    await user.click(submit);
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(/영문과 숫자로 6자 이상/);
    expect(signup).not.toHaveBeenCalled();
  });

  it('AU-05 · 확인 값이 다르면 포커스를 보내고 원래 비밀번호를 수정해도 다시 검증한다', async () => {
    visit('/signup');
    const { user, form, submit } = await fill('회원가입');
    const confirm = form.getByLabelText('비밀번호 확인');
    await user.type(confirm, '1');
    await user.click(submit);
    expect(confirm).toHaveFocus();
    expect(confirm).toBeInvalid();
    expect(confirm).toHaveAccessibleDescription(/한 번 더/);
    await user.type(form.getByLabelText('비밀번호'), '1');
    expect(confirm).toBeValid();
  });

  it('AU-01/04 · 기존 아이디는 대소문자를 바꿔도 거절하고 아이디 칸으로 돌아간다', async () => {
    const api = createMemoryApi();
    await api.auth.signUp('LEAF', secret);
    await api.auth.logOut();
    visit('/signup', api);
    const { user, form, submit } = await fill('회원가입');
    await user.click(submit);
    expect(await form.findByRole('alert')).toHaveTextContent('이미 사용 중인 아이디');
    const id = form.getByLabelText('아이디');
    expect(id).toHaveFocus();
    expect(id).toBeInvalid();
    expect(id).toHaveAccessibleDescription(/다른 아이디/);
    await user.type(id, '1');
    expect(id).toBeValid();
  });

  it.each(['ABCdef', '123456'])('AU-05/07 · 단일 문자 종류도 가입되고 비밀번호는 폼 밖으로 노출되지 않는다 (%#)', async password => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => vi.spyOn(console, method));
    visit('/signup?next=%2Freviews%3Fmine%3D1%23mine');
    const { user, form, submit } = await fill('회원가입', 'Leaf', password);
    for (const label of ['비밀번호', '비밀번호 확인']) {
      const input = form.getByLabelText(label);
      expect(input).toHaveAttribute('autocomplete', 'new-password');
      expect(input).toHaveAttribute('type', 'password');
      await user.click(form.getByRole('button', { name: label + ' 보기' }));
      expect(input).toHaveAttribute('type', 'text');
      expect(document.body).not.toHaveTextContent(password);
      await user.click(form.getByRole('button', { name: label + ' 숨기기' }));
      expect(input).toHaveAttribute('type', 'password');
    }
    expect(form.getByLabelText('비밀번호')).toHaveAccessibleDescription(/다른 곳에서 쓰는 비밀번호/);
    await user.click(submit);
    await waitFor(() => expect(window.location.pathname).toBe('/reviews'));
    expect(window.location.search + window.location.hash).toBe('?mine=1#mine');
    expect(window.location.href).not.toContain(password);
    expect(document.body).not.toHaveTextContent(password);
    expect(JSON.stringify(localStorage)).not.toContain(password);
    expect(JSON.stringify(logs.map(spy => spy.mock.calls))).not.toContain(password);
  });
});

describe('로그인과 회원 경로', () => {
  it('AU-01 · 없는 아이디와 틀린 비밀번호에 같은 안내를 연결한다', async () => {
    const api = createMemoryApi();
    await api.auth.signUp('Leaf', secret);
    await api.auth.logOut();
    visit('/login', api);
    const { user, form, submit } = await fill('로그인', 'Leaf', 'wrong1');
    const id = form.getByLabelText('아이디');
    const password = form.getByLabelText('비밀번호');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    for (const value of ['Leaf', 'x']) {
      await user.clear(id);
      await user.type(id, value);
      await user.click(submit);
      const message = '아이디와 비밀번호를 다시 확인해 주세요.';
      expect(await form.findByRole('alert')).toHaveTextContent(message);
      expect(id).toHaveFocus();
      expect(id).toHaveAccessibleDescription(message);
      expect(password).toHaveAccessibleDescription(message);
    }
  });

  it.each([
    ['/login', '로그인', 'logIn'],
    ['/signup', '회원가입', 'signUp'],
  ] as const)('%s · 처리 중 중복 제출을 막고 외부 next를 홈으로 바꾼다', async (path, name, action) => {
    const api = createMemoryApi();
    let finish!: (user: SessionUser) => void;
    const spy = vi.spyOn(api.auth, action).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    visit(path + '?next=%2F%2Fevil.example', api);
    const { user, form, submit } = await fill(name);
    expect(within(screen.getByRole('main')).getByRole('link')).toHaveAttribute('href', (path === '/login' ? '/signup' : '/login') + '?next=%2F');
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(form.getByRole('status')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form', { name }));
    expect(spy).toHaveBeenCalledTimes(1);
    await act(async () => finish(member));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/'));
  });

  it('AU-01/04/06 · 전환 링크가 next를 유지하고 대소문자가 다른 로그인과 세션 복원이 같은 경로로 돌아간다', async () => {
    const api = createMemoryApi();
    await api.auth.signUp('Leaf', secret);
    await api.auth.logOut();
    const query = '?next=%2Freviews%3Fmine%3D1%23mine';
    const app = visit('/login' + query, api);
    for (const [page, link, path] of [['로그인', '회원가입', '/signup'], ['회원가입', '로그인', '/login']] as const) {
      await formFor(page);
      const other = within(screen.getByRole('main')).getByRole('link', { name: link });
      expect(other).toHaveAttribute('href', path + query);
      await userEvent.click(other);
    }
    const { user, submit } = await fill('로그인', 'lEaF');
    await user.click(submit);
    await waitFor(() => expect(window.location.pathname + window.location.search + window.location.hash).toBe('/reviews?mine=1#mine'));
    app.unmount();
    for (const path of ['/signup', '/login']) {
      const restored = visit(path + query, createMemoryApi());
      expect(screen.queryByRole('link', { name: '회원가입' })).not.toBeInTheDocument();
      await waitFor(() => expect(window.location.pathname + window.location.search + window.location.hash).toBe('/reviews?mine=1#mine'));
      expect(screen.getByRole('button', { name: '내 계정' })).toBeInTheDocument();
      restored.unmount();
    }
  });

  it.each(['/signup', '/login'])('%s · 세션 확인 중 폼과 비회원 링크를 숨긴다', async path => {
    const api = createMemoryApi();
    let finish!: (user: SessionUser | null) => void;
    vi.spyOn(api.auth, 'getSession').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    visit(path, api);
    expect(await screen.findByText('로그인 상태를 확인하고 있어요.')).toHaveRole('status');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^(로그인|회원가입)$/ })).not.toBeInTheDocument();
    await act(async () => finish(null));
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
});

it.each([SignupPage, LoginPage])('서비스 미설정 시 준비 안내를 표시한다 (%#)', async Page => {
  render(
    <MemoryRouter>
      <CommerceContext.Provider value={{ api: createMemoryApi(), configured: false }}>
        <Page />
      </CommerceContext.Provider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('서비스를 준비하고 있어요.');
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
});

it('로그인 오류에 포함된 비밀번호는 화면, URL, 콘솔에 노출되지 않고 다시 제출할 수 있다', async () => {
  const api = createMemoryApi();
  const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => vi.spyOn(console, method));
  vi.spyOn(api.auth, 'logIn').mockRejectedValueOnce(new Error(secret)).mockResolvedValueOnce(member);
  visit('/login', api);
  const { user, form, submit } = await fill('로그인');
  await user.click(submit);
  expect(await form.findByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요.');
  expect(document.body).not.toHaveTextContent(secret);
  expect(window.location.href).not.toContain(secret);
  expect(submit).toBeEnabled();
  await user.click(submit);
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(window.location.href).not.toContain(secret);
  expect(JSON.stringify(logs.map(spy => spy.mock.calls))).not.toContain(secret);
});
