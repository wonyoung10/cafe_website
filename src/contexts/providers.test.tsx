import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createMemoryApi } from '@/services/memoryApi';
import type { CartItem, SessionUser } from '@/types/commerce';
import { AuthProvider, CartProvider, useAuth, useCart } from '.';
import { CommerceContext } from './commerce';
import { guestKey } from './guestCart';

const item: CartItem = { menuId: 'americano', quantity: 2, temperature: 'ice' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { resolve, promise };
}
function Probe() {
  const auth = useAuth();
  const cart = useCart();
  return <><output data-testid="state">{auth.status}/{cart.status}/{cart.count}/{cart.total}</output>
    <button onClick={() => void cart.reload()}>다시 읽기</button>
    <button onClick={() => void cart.add(item)}>담기</button></>;
}
function mount(api = createMemoryApi()) {
  render(<StrictMode><CommerceContext.Provider value={{ api, configured: true }}>
    <AuthProvider><CartProvider><Probe /></CartProvider></AuthProvider>
  </CommerceContext.Provider></StrictMode>);
}
const state = () => screen.getByTestId('state');
beforeEach(() => localStorage.clear());

it('validates guest storage, merges once in StrictMode, and empties the visible cart at logout', async () => {
  const api = createMemoryApi();
  await api.auth.signUp('Cafe123', 'abcdef');
  await api.cart.add(item);
  localStorage.setItem(guestKey, JSON.stringify([item, { ...item, quantity: 0 }, null, { ...item, menuId: 'missing' }]));
  const merge = vi.spyOn(api.cart, 'merge');
  mount(api);
  await waitFor(() => expect(state()).toHaveTextContent('member/ready/4/19200'));
  expect(merge).toHaveBeenCalledExactlyOnceWith([item]);
  expect(localStorage.getItem(guestKey)).toBeNull();
  await act(() => api.auth.logOut());
  expect(state()).toHaveTextContent('guest/ready/0/0');
});

it('retains a failed merge for retry and does not re-merge after a subsequent list error', async () => {
  localStorage.setItem(guestKey, JSON.stringify([item]));
  const api = createMemoryApi();
  const merge = vi.spyOn(api.cart, 'merge').mockRejectedValueOnce(new Error('offline'));
  mount(api);
  await waitFor(() => expect(state()).toHaveTextContent('guest/ready/2/9600'));
  await act(() => api.auth.signUp('Cafe123', 'abcdef'));
  await waitFor(() => expect(state()).toHaveTextContent('member/error/0/0'));
  expect(localStorage.getItem(guestKey)).toBe(JSON.stringify([item]));
  vi.spyOn(api.cart, 'list').mockRejectedValueOnce(new Error('offline'));
  // A second auth transition retries the retained guest cart.
  await act(() => api.auth.logOut());
  expect(state()).toHaveTextContent('guest/ready/0/0');
  await act(() => api.auth.logIn('Cafe123', 'abcdef'));
  await waitFor(() => expect(localStorage.getItem(guestKey)).toBeNull());
  await act(async () => { screen.getByText('다시 읽기').click(); });
  await waitFor(() => expect(state()).toHaveTextContent('member/ready/2/9600'));
  expect(merge).toHaveBeenCalledTimes(2);
});

it('ignores a stale initial session and stale cart reads from another member', async () => {
  const api = createMemoryApi();
  const staleSession = deferred<SessionUser | null>();
  const staleCart = deferred<CartItem[]>();
  vi.spyOn(api.auth, 'getSession').mockReturnValue(staleSession.promise);
  const list = vi.spyOn(api.cart, 'list').mockReturnValueOnce(staleCart.promise);
  mount(api);
  await act(() => api.auth.signUp('Cafe123', 'abcdef'));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
  await act(() => api.auth.signUp('Cafe456', 'abcdef'));
  await waitFor(() => expect(state()).toHaveTextContent('member/ready/0/0'));
  await act(async () => { staleSession.resolve(null); staleCart.resolve([item]); });
  expect(state()).toHaveTextContent('member/ready/0/0');
});

it('handles malformed guest JSON and saves changes before login', async () => {
  localStorage.setItem(guestKey, '{');
  mount();
  await waitFor(() => expect(state()).toHaveTextContent('guest/ready/0/0'));
  await act(async () => { screen.getByText('담기').click(); });
  expect(JSON.parse(localStorage.getItem(guestKey)!)).toEqual([item]);
  expect(state()).toHaveTextContent('guest/ready/2/9600');
});
