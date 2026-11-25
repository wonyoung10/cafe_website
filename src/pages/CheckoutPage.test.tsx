import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import AppRoutes from '@/app/router';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import { readAttempt, readReceipt, saveAttempt } from '@/services/paymentRecords';
import { renderApp } from '@/test/renderWithRouter';
import type { PaymentMethod, ReceiveMethod } from '@/types/commerce';
import { approvalNumber, paymentTiming } from '@/utils/payment';

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
const timing = { ...paymentTiming };
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Object.assign(paymentTiming, { approval: 0, approved: 20, recheck: 0 });
});
afterEach(() => {
  Object.assign(paymentTiming, timing);
  vi.unstubAllGlobals();
});

async function checkout() {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  renderApp('/checkout', { api });
  await screen.findByRole('group', { name: '받는 방법' });
  return api;
}

async function choose(receive: string, payment: string, instrument = '나이테카드') {
  await userEvent.click(screen.getByRole('radio', { name: receive }));
  await userEvent.click(screen.getByRole('radio', { name: payment }));
  if (payment === '온라인 결제') await userEvent.click(screen.getByRole('radio', { name: instrument }));
}

const opener = () => screen.getByRole('button', { name: '9,600원 결제하기' });
const press = (name: string) => userEvent.click(screen.getByRole('button', { name }));

/** 결제창을 열어 앱 인증까지 누른다 */
async function authorize() {
  await userEvent.click(opener());
  await press('인증 요청하기');
  await press('인증하고 결제하기');
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
  expect(Array.from(main.querySelectorAll('input')).every(input => input.type === 'radio')).toBe(true);
  expect(main.querySelector('textarea, iframe')).toBeNull();
  if (p === 'online') {
    await userEvent.dblClick(opener());
    const dialog = within(screen.getByRole('dialog', { name: '하루의 잎 결제' }));
    expect(dialog.getByText('결제 금액 9,600원')).toBeVisible();
    expect(dialog.getByText('아메리카노 ICE')).toBeVisible();
    expect(dialog.getByText('나이테카드')).toBeVisible();
    expect(dialog.getByText('일시불')).toBeVisible();
    expect(dialog.getByText('모의 결제예요. 실제 결제는 이루어지지 않아요.')).toBeVisible();
    expect(main.querySelector('dialog input, dialog textarea, dialog select, dialog iframe')).toBeNull();
    await userEvent.dblClick(dialog.getByRole('button', { name: '인증 요청하기' }));
    expect(dialog.getByRole('heading', { name: '나이테카드 앱 인증' })).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
    await userEvent.dblClick(dialog.getByRole('button', { name: '인증하고 결제하기' }));
    expect(dialog.getByRole('heading', { name: '승인을 요청하고 있어요' })).toHaveFocus();
    expect(dialog.queryByRole('button')).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();
    await waitFor(() => expect(spy).toHaveBeenCalled());
  } else {
    await userEvent.dblClick(screen.getByRole('button', { name: '주문하기' }));
    expect(screen.getByRole('button', { name: '주문 처리 중' })).toBeDisabled();
  }
  expect(spy).toHaveBeenCalledExactlyOnceWith(r, p);
  await act(async () => { release(); });
  expect(await screen.findByText(status)).toBeVisible();
  expect(screen.getByText(receive)).toBeVisible();
  expect(screen.getByText(payment)).toBeVisible();
  expect(screen.getByRole('heading', { name: p === 'online' ? '결제가 완료됐어요' : '주문이 접수됐어요' })).toHaveFocus();
  expect(screen.getByText('아메리카노 ICE')).toBeVisible();
  expect(screen.getByRole('link', { name: '장바구니, 0개' })).toBeInTheDocument();
  expect(await api.cart.list()).toEqual([]);
  const orders = await api.orders.list();
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ receiveMethod: r, paymentMethod: p, total: 9600 });
  expect(screen.getByText('주문번호 ' + orders[0]!.orderNo)).toBeVisible();
  if (p === 'online') {
    const receipt = within(screen.getByRole('region', { name: '영수증' }));
    expect(receipt.getByText('나이테카드')).toBeVisible();
    expect(receipt.getByText('일시불')).toBeVisible();
    expect(receipt.getByText(approvalNumber(orders[0]!.id))).toBeVisible();
    expect(receipt.getByText('9,600원')).toBeVisible();
    expect(receipt.getByText(/모의 결제 영수증이에요/)).toBeVisible();
  } else expect(screen.queryByRole('region', { name: '영수증' })).toBeNull();
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

it('SH-09 requires a payment instrument for online payment', async () => {
  const api = await checkout();
  await userEvent.click(screen.getByRole('radio', { name: '테이크아웃' }));
  await userEvent.click(screen.getByRole('radio', { name: '온라인 결제' }));
  await userEvent.click(opener());
  const first = screen.getByRole('radio', { name: '나이테카드' });
  expect(first).toHaveFocus();
  expect(first).toHaveAccessibleDescription(/결제수단을 선택해 주세요/);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await api.orders.list()).toEqual([]);
});

it.each(['취소', 'Escape'])('SH-07/10 closes the payment window with %s without placing an order', async how => {
  const api = await checkout();
  const spy = vi.spyOn(api.orders, 'place');
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  if (how === '취소') await press('취소');
  else await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('heading', { level: 1, name: '결제' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '나이테카드' })).toBeChecked();
  expect(spy).not.toHaveBeenCalled();
  expect(await api.cart.list()).toEqual([item]);
});

it.each([['낙엽카드', '한도를 넘었어요'], ['잎맥페이', '잔액이 부족해요']])('SH-11 declines %s and returns to the instrument choice', async (name, title) => {
  const api = await checkout();
  const spy = vi.spyOn(api.orders, 'place');
  await choose('테이크아웃', '온라인 결제', name);
  await authorize();
  expect(await screen.findByRole('heading', { name: title })).toHaveFocus();
  expect(spy).not.toHaveBeenCalled();
  await press('다른 결제수단 고르기');
  await waitFor(() => expect(screen.getByRole('radio', { name: '나이테카드' })).toHaveFocus());
  await userEvent.click(screen.getByRole('radio', { name: '이슬페이' }));
  await authorize();
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  expect(within(screen.getByRole('region', { name: '영수증' })).getByText('이슬페이')).toBeVisible();
  expect(await api.orders.list()).toHaveLength(1);
});

it('SH-11 lets the member refuse in the app and try again in the same window', async () => {
  const api = await checkout();
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  await press('인증 요청하기');
  await press('거절하기');
  expect(screen.getByRole('heading', { name: '인증을 거절했어요' })).toHaveFocus();
  expect(await api.orders.list()).toEqual([]);
  await press('다시 시도하기');
  await press('인증 요청하기');
  await press('인증하고 결제하기');
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
});

it('SH-11 stops when app authorization times out', async () => {
  paymentTiming.verify = 0;
  const api = await checkout();
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  await press('인증 요청하기');
  expect(await screen.findByRole('heading', { name: '인증 시간이 지났어요' })).toBeVisible();
  expect(await api.orders.list()).toEqual([]);
});

it('SH-07/11 keeps the cart and choices on failure, permits retry, and opens the receipt even if cart refresh fails', async () => {
  const api = await checkout();
  vi.spyOn(api.orders, 'place').mockRejectedValueOnce(new Error('network'));
  await choose('매장에서', '온라인 결제');
  await authorize();
  expect(await screen.findByRole('heading', { name: '승인되지 않았어요' })).toBeVisible();
  expect(await api.cart.list()).toEqual([item]);
  expect(await api.orders.list()).toHaveLength(0);
  await press('다시 시도하기');
  await press('인증 요청하기');
  const list = api.cart.list;
  let calls = 0;
  vi.spyOn(api.cart, 'list').mockImplementation(() => ++calls === 2 ? Promise.reject(new Error('network')) : list());
  await press('인증하고 결제하기');
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  expect(await api.orders.list()).toHaveLength(1);
  await userEvent.click(screen.getByRole('link', { name: /장바구니,/ }));
  await userEvent.click(await screen.findByRole('button', { name: '장바구니 다시 불러오기' }));
  await waitFor(() => expect(screen.getByText('장바구니가 비어 있어요.')).toBeVisible());
});

it('SH-12 treats a lost response as approved when the order exists', async () => {
  const api = await checkout();
  const place = api.orders.place;
  vi.spyOn(api.orders, 'place').mockImplementationOnce(async (r, p) => { await place(r, p); throw new Error('network'); });
  await choose('테이크아웃', '온라인 결제');
  await authorize();
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  const [order] = await api.orders.list();
  expect(await api.orders.list()).toHaveLength(1);
  expect(readReceipt(order!.id)).toEqual({ instrumentId: 'ring-credit', months: 0 });
});

it('SH-12 asks to check again when the result cannot be confirmed', async () => {
  const api = await checkout();
  const { place, list } = api.orders;
  vi.spyOn(api.orders, 'place').mockImplementationOnce(async (r, p) => { await place(r, p); throw new Error('network'); });
  const orders = vi.spyOn(api.orders, 'list').mockImplementationOnce(list).mockRejectedValueOnce(new Error('network'));
  await choose('테이크아웃', '온라인 결제');
  await authorize();
  expect(await screen.findByRole('heading', { name: '승인 결과를 확인하지 못했어요' })).toBeVisible();
  expect(screen.getByRole('link', { name: '주문 내역 보기' })).toHaveAttribute('href', '/orders');
  orders.mockImplementation(list);
  await press('결과 다시 확인하기');
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  expect(await list()).toHaveLength(1);
});

it('SH-12 does not charge a cart that changed in another tab', async () => {
  const api = await checkout();
  const spy = vi.spyOn(api.orders, 'place');
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
  await press('인증 요청하기');
  await press('인증하고 결제하기');
  expect(await screen.findByRole('heading', { name: '장바구니가 바뀌었어요' })).toBeVisible();
  await press('금액 다시 확인하기');
  expect(await screen.findByRole('button', { name: '13,100원 결제하기' })).toBeVisible();
  expect(spy).not.toHaveBeenCalled();
});

it('SH-12 reports a cart that another tab already paid for', async () => {
  const api = await checkout();
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  await api.orders.place('takeout', 'onsite');
  await press('인증 요청하기');
  await press('인증하고 결제하기');
  expect(await screen.findByRole('heading', { name: '이미 처리된 주문이에요' })).toBeVisible();
  expect(await api.orders.list()).toHaveLength(1);
});

it.each([true, false])('SH-12 settles an interrupted payment after a reload (order saved: %s)', async saved => {
  const api = createMemoryApi();
  const user = await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  saveAttempt(user.id, { receive: 'takeout', instrumentId: 'dew-pay', months: 0, knownOrders: [] });
  if (saved) await api.orders.place('takeout', 'online');
  renderApp('/checkout', { api });
  if (saved) {
    expect(await screen.findByRole('heading', { name: '결제가 완료됐어요' })).toBeVisible();
    expect(within(screen.getByRole('region', { name: '영수증' })).getByText('이슬페이')).toBeVisible();
  } else {
    expect(await screen.findByText(/이전 결제는 승인되지 않았어요/)).toBeVisible();
    expect(screen.getByRole('button', { name: '주문하기' })).toBeEnabled();
  }
  expect(readAttempt(user.id)).toBeNull();
});

it('SH-12 restores choices after a reload without reopening the payment window', async () => {
  const api = await checkout();
  await choose('매장에서', '온라인 결제', '가지카드');
  await userEvent.click(opener());
  document.body.innerHTML = '';
  renderApp('/checkout', { api });
  expect(await screen.findByRole('radio', { name: '가지카드' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '매장에서' })).toBeChecked();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('SH-09 offers installments only for credit cards from 50,000 won', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add({ ...item, quantity: 11 });
  renderApp('/checkout', { api });
  await screen.findByRole('group', { name: '받는 방법' });
  await choose('테이크아웃', '온라인 결제');
  await userEvent.selectOptions(screen.getByRole('combobox', { name: '할부' }), '3개월 할부');
  await userEvent.click(screen.getByRole('radio', { name: '가지카드' }));
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getByText(/체크카드는 할부를 쓸 수 없어요/)).toBeVisible();
  await userEvent.click(screen.getByRole('radio', { name: '나이테카드' }));
  await press('52,800원 결제하기');
  expect(screen.getByRole('dialog')).toHaveTextContent('3개월 할부');
  await press('인증 요청하기');
  await press('인증하고 결제하기');
  expect(within(await screen.findByRole('region', { name: '영수증' })).getByText('3개월 할부')).toBeVisible();
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

function Back() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>뒤로 가기</button>;
}

async function checkoutWithBack() {
  const api = createMemoryApi();
  await api.auth.signUp('cafe123', 'abcdef');
  await api.cart.add(item);
  render(<MemoryRouter initialEntries={['/cart', '/checkout']}><AppRoutes api={api} /><Back /></MemoryRouter>);
  await screen.findByRole('group', { name: '받는 방법' });
  return api;
}

it('SH-12 closes the payment window on Back, and the receipt goes Back to the cart', async () => {
  const api = await checkoutWithBack();
  await choose('테이크아웃', '온라인 결제');
  await userEvent.click(opener());
  await press('인증 요청하기');
  await press('뒤로 가기');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: '결제' })).toBeVisible();
  expect(await api.orders.list()).toEqual([]);
  await authorize();
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  await press('뒤로 가기');
  expect(await screen.findByRole('heading', { name: '장바구니' })).toBeVisible();
});

it('SH-12 keeps showing the approval when Back is pressed while it is pending', async () => {
  const api = await checkoutWithBack();
  const place = api.orders.place;
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(api.orders, 'place').mockImplementation(async (r, p) => { await paused; return place(r, p); });
  await choose('테이크아웃', '온라인 결제');
  await authorize();
  await press('뒤로 가기');
  await press('뒤로 가기');
  expect(screen.getByRole('heading', { name: '승인을 요청하고 있어요' })).toBeVisible();
  await act(async () => { release(); });
  expect(await screen.findByText('모의 결제 완료')).toBeVisible();
  expect(await api.orders.list()).toHaveLength(1);
});

it('SH-07 replaces checkout with the receipt so Back returns to the cart', async () => {
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
