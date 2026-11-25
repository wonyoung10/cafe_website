import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { renderApp } from '@/test/renderWithRouter';

beforeEach(() => localStorage.clear());

it('AU-01 · 비회원에게 데스크톱과 모바일에서 로그인 및 회원가입 링크를 제공한다', async () => {
  renderApp('/menu', { api: createMemoryApi() });
  const header = within(screen.getByRole('banner'));
  expect(await header.findByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  expect(header.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
  await userEvent.click(header.getByRole('button', { name: '메뉴 열기' }));
  const panel = within(header.getByRole('navigation', { name: '모바일 메뉴' }));
  expect(panel.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  expect(panel.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
});

it('AU-01 · 키보드로 내 계정을 열고 Escape로 포커스를 되돌리며 바깥 클릭과 경로 이동으로 닫는다', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('Leaf', 'Maple709');
  renderApp('/menu', { api });
  const user = userEvent.setup();
  const trigger = await screen.findByRole('button', { name: '내 계정' });
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const disclosure = document.getElementById(trigger.getAttribute('aria-controls')!)!;
  expect(within(disclosure).getByText('Leaf')).toBeVisible();
  await user.tab();
  expect(screen.getByRole('link', { name: '주문 내역' })).toHaveFocus();
  expect(screen.getByRole('link', { name: '주문 내역' })).toHaveAttribute('href', '/orders');
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.keyboard(' ');
  await user.click(document.body);
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(screen.getByRole('heading', { level: 1 }));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  const reviews = screen.getByRole('link', { name: '내 리뷰' });
  expect(reviews).toHaveAttribute('href', '/reviews?mine=1');
  await user.click(reviews);
  expect(screen.getByRole('button', { name: '내 계정' })).toHaveAttribute('aria-expanded', 'false');
});

it.each(['desktop', 'panel'])('AU-01 · %s 로그아웃이 세션을 종료하고 로그인 링크로 포커스를 옮긴다', async variant => {
  const api = createMemoryApi();
  await api.auth.signUp('Leaf', 'Maple709');
  renderApp('/menu', { api });
  const user = userEvent.setup();
  const trigger = await screen.findByRole('button', { name: '내 계정' });
  await user.click(variant === 'panel' ? screen.getByRole('button', { name: '메뉴 열기' }) : trigger);
  const account = within(variant === 'panel'
    ? screen.getByRole('navigation', { name: '모바일 메뉴' })
    : screen.getByRole('banner'));
  expect(account.getByText('Leaf', { selector: 'p', ignore: '[hidden] *' })).toBeVisible();
  expect(account.getByRole('link', { name: '내 리뷰' })).toHaveAttribute('href', '/reviews?mine=1');
  await user.click(account.getByRole('button', { name: '로그아웃' }));
  expect(await account.findByRole('link', { name: '로그인' })).toHaveFocus();
  expect(await api.auth.getSession()).toBeNull();
});
