import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { renderApp } from '@/test/renderWithRouter';

beforeEach(() => localStorage.clear());

function menuCard(name: string) {
  const card = screen.getByRole('heading', { level: 3, name }).closest('article');
  if (!card) throw new Error('Missing menu card');
  return within(card);
}

it('SH-01/03 adds both card variants as a guest, keeps them across remount, and merges with a member cart', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add({ menuId: 'americano', temperature: 'hot', quantity: 1 });
  await api.auth.logOut();
  const menu = renderApp('/menu', { api });
  const lead = menuCard('카페라떼');
  await userEvent.click(lead.getByRole('radio', { name: 'ICE' }));
  await userEvent.click(lead.getByRole('button', { name: '담기' }));
  expect(lead.getByRole('status')).toHaveTextContent('카페라떼 ICE');
  for (const name of ['아메리카노', '쿠키']) {
    await userEvent.click(menuCard(name).getByRole('button', { name: '담기' }));
    expect(menuCard(name).getByRole('status')).toHaveTextContent(name);
  }
  expect(menuCard('쿠키').queryByRole('radio')).toBeNull();
  expect(menuCard('에스프레소').queryByRole('radio')).toBeNull();
  expect(screen.getByRole('link', { name: '장바구니, 3개' })).toHaveTextContent('3');
  menu.unmount();

  renderApp('/cart', { api });
  const checkout = await screen.findByRole('link', { name: '결제하기' });
  expect(new URL(checkout.getAttribute('href')!, 'https://local.test').searchParams.get('next')).toBe('/checkout');
  await userEvent.click(checkout);
  expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
  await act(() => api.auth.logIn('cafe123', 'abcdef'));
  expect(await screen.findByRole('link', { name: '장바구니, 4개' })).toBeInTheDocument();
  expect(await api.cart.list()).toEqual(expect.arrayContaining([
    { menuId: 'americano', temperature: 'hot', quantity: 2 },
    { menuId: 'cafe-latte', temperature: 'ice', quantity: 1 },
    { menuId: 'cookie', temperature: null, quantity: 1 },
  ]));
});

it('SH-01 leaves featured cards without purchase controls', () => {
  renderApp('/', { api: createMemoryApi() });
  expect(menuCard('카페라떼').queryByRole('button', { name: '담기' })).toBeNull();
});

it('SH-02 changes quantity within bounds and confirms removal with keyboard focus restoration', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add({ menuId: 'americano', temperature: 'hot', quantity: 19 });
  await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
  renderApp('/cart', { api });
  const more = await screen.findByRole('button', { name: '아메리카노 HOT 수량 늘리기' });
  await userEvent.click(more);
  expect(more).toBeDisabled();
  expect(screen.getByText('99,500원')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '아메리카노 HOT 수량 줄이기' }));
  expect(more).toBeEnabled();
  expect(screen.getByText('94,700원')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '쿠키 수량 줄이기' })).toBeDisabled();

  const remove = screen.getByRole('button', { name: '아메리카노 HOT 삭제' });
  await userEvent.click(remove);
  expect(screen.getByRole('button', { name: '취소' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(remove).toHaveFocus();
  expect(await api.cart.list()).toHaveLength(2);
  await userEvent.keyboard('{Enter}{Tab}{Enter}');
  const next = screen.getByRole('button', { name: '쿠키 삭제' });
  expect(next).toHaveFocus();
  await userEvent.click(next);
  await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));
  expect(screen.getByText('장바구니가 비어 있어요.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '메뉴 보러 가기' })).toHaveFocus();
  expect(await api.cart.list()).toEqual([]);
});

it('SH-02 preserves visible lines on mutation failure, then reloads before checkout', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
  vi.spyOn(api.cart, 'setQuantity').mockRejectedValueOnce(new Error('network'));
  renderApp('/cart', { api });
  await userEvent.click(await screen.findByRole('button', { name: '쿠키 수량 늘리기' }));
  expect(screen.getByRole('alert')).toHaveTextContent('다시 불러와');
  expect(screen.getByRole('heading', { name: '쿠키' })).toBeVisible();
  expect(screen.getByRole('button', { name: '결제하기' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: '장바구니 다시 불러오기' }));
  expect(screen.getByRole('link', { name: '결제하기' })).toHaveAttribute('href', '/checkout');
});

it('SH-03 redirects a guest opening checkout directly', async () => {
  renderApp('/checkout', { api: createMemoryApi() });
  expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
});
