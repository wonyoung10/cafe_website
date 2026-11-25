import { screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { renderApp } from '@/test/renderWithRouter';

vi.mock('@/services', async importOriginal => ({
  ...await importOriginal<typeof import('@/services')>(), configured: false,
}));

beforeEach(() => localStorage.clear());
it.each([
  ['/signup', '회원가입'], ['/login', '로그인'], ['/cart', '장바구니'], ['/checkout', '결제'],
  ['/orders', '주문 내역'], ['/orders/id', '주문 상세'], ['/reviews', '리뷰 모아보기'],
  ['/reviews/new?order=id&menu=cookie', '리뷰 쓰기'], ['/reviews/id/edit', '리뷰 수정'],
])('renders %s with its heading and title', async (path, title) => {
  const api = createMemoryApi();
  // 로그인한 회원이 인증 화면에 오면 홈으로 보내므로 두 화면은 비회원으로 연다
  if (path !== '/signup' && path !== '/login') await api.auth.signUp('Cafe123', 'abcdef');
  renderApp(path, { api });
  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  expect(document.title).toBe(title + ' · 하루의 잎');
});
it('redirects guests arriving at protected pages', async () => {
  renderApp('/reviews/new?order=1&menu=cookie', { api: createMemoryApi() });
  expect(await screen.findByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
});
it('shows a service notice without keys', async () => {
  renderApp('/checkout');
  expect(await screen.findByText(/서비스를 준비하고 있어요/)).toBeInTheDocument();
});
