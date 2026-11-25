import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import AppRoutes from '@/app/router';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { renderApp } from '@/test/renderWithRouter';
import type { PaymentMethod, ReceiveMethod } from '@/types/commerce';

const item = { menuId: 'americano', temperature: 'ice', quantity: 2 } as const;

// jsdom has HTMLDialogElement but no native top layer.
const dialogProto = HTMLDialogElement.prototype;
const needsDialogShim = typeof dialogProto.showModal !== 'function';
beforeAll(() => {
  if (needsDialogShim) {
    Object.defineProperties(dialogProto, {
      showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
      close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
    });
  }
});
afterAll(() => {
  if (needsDialogShim) {
    Reflect.deleteProperty(dialogProto, 'showModal');
    Reflect.deleteProperty(dialogProto, 'close');
  }
});
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

async function checkout() {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  renderApp('/checkout', { api });
  await screen.findByRole('group', { name: '받는 방법' });
  return api;
}

async function choose(receive: string, payment: string) {
  await userEvent.click(screen.getByRole('radio', { name: receive }));
  await userEvent.click(screen.getByRole('radio', { name: payment }));
}

const combinations: [ReceiveMethod, string, PaymentMethod, string, string][] = [
  ['takeout', '테이크아웃', 'onsite', '현장 결제', '현장에서 결제 예정'],
  ['takeout', '테이크아웃', 'online', '온라인 결제', '모의 결제 완료'],
  ['dine-in', '매장에서', 'onsite', '현장 결제', '현장에서 결제 예정'],
  ['dine-in', '매장에서', 'online', '온라인 결제', '모의 결제 완료'],
];

it.each(combinations)('SH-04–07 places one %s (%s) / %s order across double clicks', async (r, receive, p, payment, status) => {
  const api = await checkout();
  const fetchRequest = vi.fn(() => Promise.reject(new Error('Unexpected fetch')));
  vi.stubGlobal('fetch', fetchRequest);
  const place = api.orders.place;
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const spy = vi.spyOn(api.orders, 'place').mockImplementation(async (r, p) => { await paused; return place(r, p); });
  expect(screen.getByText(/실제 결제는 이루어지지 않아요/)).toBeVisible();
  await choose(receive, payment);
  expect(within(screen.getByRole('group', { name: '결제 방법' })).getAllByRole('radio')).toHaveLength(2);
  const main = screen.getByRole('main');
  expect(Array.from(main.querySelectorAll('input'), input => input.type)).toEqual(['radio', 'radio', 'radio', 'radio']);
  if (p === 'online') {
    await userEvent.dblClick(screen.getByRole('button', { name: '모의 결제하기' }));
    const dialog = within(screen.getByRole('dialog', { name: '모의 결제' }));
    expect(dialog.getByText('결제 금액 9,600원')).toBeVisible();
    expect(main.querySelector('dialog input, dialog textarea, dialog select, dialog iframe')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    await userEvent.dblClick(dialog.getByRole('button', { name: '모의 결제 승인' }));
    expect(dialog.getByRole('button', { name: '취소' })).toBeDisabled();
  } else {
    await userEvent.dblClick(screen.getByRole('button', { name: '주문하기' }));
  }
  expect(spy).toHaveBeenCalledExactlyOnceWith(r, p);
  expect(screen.getAllByRole('button', { name: '주문 처리 중' }).every(button => button.hasAttribute('disabled'))).toBe(true);
  await act(async () => { release(); });
  expect(await screen.findByText(status)).toBeVisible();
  expect(screen.getByText(receive)).toBeVisible();
  expect(screen.getByText(payment)).toBeVisible();
  expect(screen.getByText('아메리카노 ICE')).toBeVisible();
  expect(screen.getByRole('link', { name: '장바구니, 0개' })).toBeInTheDocument();
  expect(await api.cart.list()).toEqual([]);
  const orders = await api.orders.list();
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ receiveMethod: r, paymentMethod: p, total: 9600 });
  expect(screen.getByText('주문번호 ' + orders[0]!.orderNo)).toBeVisible();
  expect(fetchRequest).not.toHaveBeenCalled();
});

it('SH-04/05 requires both radio groups and focuses the first invalid choice', async () => {
  const api = await checkout();
  const submit = screen.getByRole('button', { name: '주문하기' });
  await userEvent.click(submit);
  const receive = screen.getByRole('radio', { name: '테이크아웃' });
  expect(receive).toHaveFocus();
  expect(receive).toHaveAttribute('aria-invalid', 'true');
  expect(receive).toHaveAccessibleDescription('받는 방법을 선택해 주세요.');
  await userEvent.click(receive);
  await userEvent.click(submit);
  const payment = screen.getByRole('radio', { name: '현장 결제' });
  expect(payment).toHaveFocus();
  expect(payment).toHaveAccessibleDescription('결제 방법을 선택해 주세요.');
  expect(await api.orders.list()).toEqual([]);
});

it('SH-06/07 cancels a mock payment without touching the cart or placing an order', async () => {
  const api = await checkout();
  const spy = vi.spyOn(api.orders, 'place');
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(screen.getByRole('button', { name: '모의 결제하기' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('radio', { name: '온라인 결제' })).toBeChecked();
  expect(spy).not.toHaveBeenCalled();
  expect(await api.orders.list()).toEqual([]);
  expect(await api.cart.list()).toEqual([item]);
});

it('SH-07 keeps the cart and choices on failure, permits retry, and opens the receipt even if cart refresh fails', async () => {
  const api = await checkout();
  vi.spyOn(api.orders, 'place').mockRejectedValueOnce(new Error('network'));
  await choose('매장에서', '온라인 결제');
  const start = screen.getByRole('button', { name: '모의 결제하기' });
  await userEvent.click(start);
  await userEvent.click(screen.getByRole('button', { name: '모의 결제 승인' }));
  expect(screen.getByRole('alert')).toHaveTextContent('다시 시도해 주세요');
  expect(start).toBeEnabled();
  expect(await api.cart.list()).toEqual([item]);
  expect(await api.orders.list()).toHaveLength(0);
  vi.spyOn(api.cart, 'list').mockRejectedValueOnce(new Error('network'));
  await userEvent.click(start);
  await userEvent.click(screen.getByRole('button', { name: '모의 결제 승인' }));
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  expect(await api.orders.list()).toHaveLength(1);
  await userEvent.click(screen.getByRole('link', { name: /장바구니,/ }));
  await userEvent.click(await screen.findByRole('button', { name: '장바구니 다시 불러오기' }));
  await waitFor(() => expect(screen.getByText('장바구니가 비어 있어요.')).toBeVisible());
});

it('SH-07 prevents ordering an empty cart and links back to the menu', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  renderApp('/checkout', { api });
  expect(await screen.findByText('장바구니가 비어 있어요.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '주문하기' })).toBeNull();
  expect(screen.getByRole('link', { name: '메뉴 보러 가기' })).toHaveAttribute('href', '/menu');
});

it('SH-03/07 waits for an in-flight menu addition before offering checkout', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  const add = api.cart.add;
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(api.cart, 'add').mockImplementation(async line => { await paused; return add(line); });
  renderApp('/menu?category=dessert', { api });
  await screen.findByRole('link', { name: '장바구니, 2개' });
  const cookie = screen.getByRole('heading', { name: '쿠키' }).closest('article')!;
  await userEvent.click(within(cookie).getByRole('button', { name: '담기' }));
  await userEvent.click(screen.getByRole('link', { name: '장바구니, 2개' }));
  await userEvent.click(await screen.findByRole('link', { name: '결제하기' }));
  expect(await screen.findByText('주문할 메뉴를 확인하고 있어요.')).toBeVisible();
  expect(screen.queryByRole('button', { name: '주문하기' })).toBeNull();
  await act(async () => { release(); });
  expect(await screen.findByText('13,100원')).toBeVisible();
  expect(screen.getByRole('button', { name: '주문하기' })).toBeEnabled();
});

it('SH-07 replaces checkout with the receipt so Back returns to the cart', async () => {
  function Back() {
    const navigate = useNavigate();
    return <button onClick={() => void navigate(-1)}>뒤로 가기</button>;
  }
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  render(<MemoryRouter initialEntries={['/cart', '/checkout']}><AppRoutes api={api} /><Back /></MemoryRouter>);
  await screen.findByRole('group', { name: '받는 방법' });
  await choose('테이크아웃', '현장 결제');
  await userEvent.click(screen.getByRole('button', { name: '주문하기' }));
  expect(await screen.findByText('현장에서 결제 예정')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
  expect(await screen.findByRole('heading', { name: '장바구니' })).toBeVisible();
  expect(screen.getByText('장바구니가 비어 있어요.')).toBeVisible();
});
