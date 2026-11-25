import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { renderApp } from '@/test/renderWithRouter';

beforeEach(() => localStorage.clear());

it('SH-08 sorts orders newest first and links each purchased menu to its review for this order', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  const coffee = { menuId: 'americano', temperature: 'hot', quantity: 1 } as const;
  const cookie = { menuId: 'cookie', temperature: null, quantity: 1 };
  await api.cart.add(cookie);
  const older = await api.orders.place('dine-in', 'onsite');
  await api.reviews.create({ orderId: older, menuId: 'cookie', rating: 5, text: '맛있어요.' }, null);
  await api.cart.add(coffee);
  await api.cart.add({ ...coffee, temperature: 'ice' });
  await api.cart.add(cookie);
  const newer = await api.orders.place('takeout', 'online');
  const reviewId = await api.reviews.create({ orderId: newer, menuId: 'americano', rating: 5, text: '고소해요.' }, null);
  const [first, second] = await api.orders.list();
  if (!first || !second) throw new Error('Missing orders');
  vi.spyOn(api.orders, 'list').mockResolvedValue([
    { ...second, createdAt: '2026-01-01T00:00:00Z' },
    { ...first, createdAt: '2026-01-02T00:00:00Z' },
  ]);
  const reviewQuery = vi.spyOn(api.reviews, 'list');
  renderApp('/orders', { api });
  const links = await within(screen.getByRole('main')).findAllByRole('link', { name: /주문번호/ });
  expect(links.map(link => link.getAttribute('href'))).toEqual(['/orders/' + newer, '/orders/' + older]);
  await userEvent.click(links[0]!);
  const reviews = within(await screen.findByRole('region', { name: '메뉴 리뷰' }));
  expect(await reviews.findByRole('link', { name: '아메리카노 리뷰 수정' })).toHaveAttribute('href', '/reviews/' + reviewId + '/edit');
  expect(reviews.getByRole('link', { name: '쿠키 리뷰 쓰기' })).toHaveAttribute('href', '/reviews/new?order=' + newer + '&menu=cookie');
  expect(reviews.getAllByRole('link')).toHaveLength(2);
  expect(reviewQuery).toHaveBeenCalledWith({ mineOnly: true });
  expect(screen.getByText('아메리카노 HOT')).toBeVisible();
  expect(screen.getByText('아메리카노 ICE')).toBeVisible();
  expect(within(screen.getByRole('region', { name: '주문 요약' })).getByText('13,100원')).toBeVisible();
  expect(within(screen.getByRole('region', { name: '영수증' })).getByText('13,100원')).toBeVisible();
});

it('SH-08 hides the receipt, lines and review links when another member views the same order id', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
  const id = await api.orders.place('takeout', 'onsite');
  renderApp('/orders/' + id, { api });
  expect(await screen.findByRole('link', { name: '쿠키 리뷰 쓰기' })).toBeInTheDocument();
  await act(() => api.auth.signUp('cafe456', 'abcdef'));
  expect(await screen.findByText('주문을 찾을 수 없어요.')).toBeInTheDocument();
  expect(screen.queryByText(/주문번호/)).toBeNull();
  expect(screen.queryByText('쿠키')).toBeNull();
  expect(screen.queryByRole('link', { name: /리뷰 쓰기/ })).toBeNull();
  await userEvent.click(screen.getByRole('link', { name: '주문 내역 보기' }));
  expect(await screen.findByText('아직 주문 내역이 없어요.')).toBeVisible();
});
