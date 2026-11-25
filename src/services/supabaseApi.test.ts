import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from './database';
import { createSupabaseApi } from './supabaseApi';

const user = { id: 'uid', email: 'coffee12@id.cafewebsite-livid.vercel.app', user_metadata: { login_id: 'Coffee12' } };
const response = (data: unknown, error: unknown = null) => ({ data, error });
const input = { orderId: 'order', menuId: 'americano', text: ' 고소해요 ', rating: 4 };
const photo = new Blob(['image'], { type: 'image/webp' });

function mockClient() {
  const replies: ReturnType<typeof response>[] = [];
  const events: string[] = [];
  const next = () => {
    const reply = replies.shift();
    if (!reply) throw new Error('Missing mock response');
    return Promise.resolve(reply);
  };
  const query = {
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
    then(resolve: (value: ReturnType<typeof response>) => void, reject: (error: unknown) => void) {
      events.push('row');
      return next().then(resolve, reject);
    },
  };
  const bucket = {
    upload: vi.fn(async () => { events.push('upload'); return response({}); }),
    remove: vi.fn(async (_paths: string[]) => { events.push('remove'); return response({}); }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://project.invalid/review-photos/' + path } }),
  };
  const off = vi.fn();
  const auth = {
    getSession: vi.fn(async () => response({ session: { user } })),
    signUp: vi.fn(async () => response({ session: { user } })),
    signInWithPassword: vi.fn(async () => response({ user })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((_cb: (event: AuthChangeEvent, session: Session | null) => void) => ({ data: { subscription: { unsubscribe: off } } })),
  };
  const client = { auth, from: vi.fn(() => query), rpc: vi.fn(next), storage: { from: vi.fn(() => bucket) } };
  const api = createSupabaseApi(async () => client as unknown as SupabaseClient<Database>);
  return { api, client, auth, query, replies, bucket, events, off };
}

describe('Supabase adapter', () => {
  it('uses the lowercase email and preserves signup display case', async () => {
    const { api, auth } = mockClient();
    const expected = { id: 'uid', loginId: 'Coffee12' };
    expect(await api.auth.signUp('Coffee12', '123456')).toEqual(expected);
    expect(auth.signUp).toHaveBeenCalledWith({ email: user.email, password: '123456', options: { data: { login_id: 'Coffee12' } } });
    expect(await api.auth.logIn('COFFEE12', '123456')).toEqual(expected);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: user.email, password: '123456' });
    auth.signUp.mockResolvedValueOnce(response({ session: null }));
    await expect(api.auth.signUp('Coffee12', '123456')).rejects.toMatchObject({ code: 'not-configured', message: expect.stringContaining('Confirm email') });
  });

  it('defers auth events until after the callback returns and cancels pending deliveries', async () => {
    vi.useFakeTimers();
    try {
      const { api, auth, off } = mockClient();
      const listener = vi.fn();
      const unsub = api.auth.onChange(listener);
      await Promise.resolve();
      const emit = auth.onAuthStateChange.mock.calls[0]![0];
      emit('SIGNED_IN', { user } as unknown as Session);
      expect(listener).not.toHaveBeenCalled();
      expect(auth.getSession).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(listener).toHaveBeenCalledWith({ id: 'uid', loginId: 'Coffee12' });
      emit('SIGNED_OUT', null);
      unsub();
      vi.runAllTimers();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(off).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });

  it('maps cart RPC parameters, SQL errors, session and network failures', async () => {
    const { api, client, replies, auth } = mockClient();
    const item = { menuId: 'cookie', quantity: 3, temperature: null };
    replies.push(response(null));
    await api.cart.merge([item]);
    expect(client.rpc).toHaveBeenCalledWith('merge_cart', { p_items: [{ menu_id: 'cookie', quantity: 3, temperature: '' }] });
    replies.push(response(null, { message: 'quantity-invalid', code: 'P0001' }));
    await expect(api.cart.add(item)).rejects.toMatchObject({ code: 'quantity-invalid' });
    replies.push(response(null, { message: 'not-found', code: 'P0001' }));
    await expect(api.cart.setQuantity(item)).rejects.toMatchObject({ code: 'forbidden' });
    auth.getSession.mockResolvedValueOnce(response({ session: null }));
    await expect(api.orders.list()).rejects.toMatchObject({ code: 'not-authenticated' });
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.auth.logIn('abcd', '123456')).rejects.toMatchObject({ code: 'network' });
    auth.signInWithPassword.mockResolvedValueOnce(response(null, { code: 'invalid_credentials' }));
    await expect(api.auth.logIn('abcd', '123456')).rejects.toMatchObject({ code: 'credentials-mismatch' });
    const calls = auth.signInWithPassword.mock.calls.length;
    await expect(api.auth.logIn('a@b c', '123456')).rejects.toMatchObject({ code: 'credentials-mismatch' });
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(calls);
  });

  it('maps cart, order lines and public review rows without leaking database columns', async () => {
    const { api, replies, client } = mockClient();
    const line = { menu_id: 'cookie', temperature: '', quantity: 2 };
    replies.push(response([line]), response({ id: 'o', order_no: 'N', total: 4000, receive_method: 'takeout',
      payment_method: 'onsite', payment_status: 'onsite-due', created_at: 'today',
      order_lines: [{ ...line, name: '쿠키', unit_price: 2000 }] }));
    expect(await api.cart.list()).toEqual([{ menuId: 'cookie', temperature: null, quantity: 2 }]);
    const orderId = '0b8f1c52-5a0e-4b7c-9f0a-2f6c1d3e4a5b';
    expect(await api.orders.get(orderId)).toEqual({ id: 'o', orderNo: 'N', total: 4000, receiveMethod: 'takeout',
      paymentMethod: 'onsite', paymentStatus: 'onsite-due', createdAt: 'today',
      lines: [{ menuId: 'cookie', temperature: null, quantity: 2, name: '쿠키', unitPrice: 2000 }] });
    // 잘못된 주소는 DB에 묻지 않고 없는 주문으로 처리한다 (남은 응답이 없으므로 요청하면 실패한다)
    expect(await api.orders.get('not-a-uuid')).toBeNull();
    replies.push(response([{ id: 'r', menu_id: 'cookie', order_id: 'private', user_id: 'private',
      rating: 5, body: '좋아요', photo_path: 'uid/p.webp', author_masked: 'coffee**',
      is_mine: false, created_at: 'today', updated_at: null }]));
    expect(await api.reviews.list({ menuId: 'cookie', sort: 'rating-high' })).toEqual([{ id: 'r', menuId: 'cookie',
      orderId: null, rating: 5, text: '좋아요', photoUrl: 'https://project.invalid/review-photos/uid/p.webp',
      authorMasked: 'coffee**', isMine: false, createdAt: 'today', updatedAt: null }]);
    expect(client.rpc).toHaveBeenCalledWith('list_reviews', { p_menu_id: 'cookie', p_mine: false, p_sort: 'rating-high' });
  });

  it('uploads first and removes the new upload when insert fails', async () => {
    const { api, replies, bucket, events, query, client } = mockClient();
    replies.push(response(null, { code: '23505' }));
    await expect(api.reviews.create(input, photo)).rejects.toMatchObject({ code: 'already-reviewed' });
    expect(events).toEqual(['upload', 'row', 'remove']);
    expect(client.storage.from).toHaveBeenCalledWith('review-photos');
    const path = bucket.remove.mock.calls[0]?.[0][0];
    expect(path).toMatch(/^uid\/[\da-f-]{36}\.webp$/);
    expect(bucket.upload).toHaveBeenCalledWith(path, photo, { contentType: 'image/webp' });
    expect(query.insert).toHaveBeenCalledWith({ user_id: 'uid', menu_id: 'americano', order_id: 'order',
      body: '고소해요', rating: 4, photo_path: path });
    replies.push(response(null, { code: '42501' }));
    await expect(api.reviews.create(input, null)).rejects.toMatchObject({ code: 'not-purchased' });
  });

  it('keeps the old photo on failed replacement and reports zero-row writes', async () => {
    const { api, replies, bucket, events } = mockClient();
    replies.push(response({ photo_path: 'uid/old.webp' }), response(null));
    await expect(api.reviews.update('r', input, photo)).rejects.toMatchObject({ code: 'forbidden' });
    expect(events).toEqual(['row', 'upload', 'row', 'remove']);
    expect(bucket.remove).not.toHaveBeenCalledWith(['uid/old.webp']);
    replies.push(response(null), response(null), response(null));
    await expect(api.reviews.update('r', input, 'keep')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.reviews.remove('r')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.cart.remove('cookie', null)).rejects.toMatchObject({ code: 'forbidden' });
    expect(bucket.remove).toHaveBeenCalledTimes(1);
  });

  it.each(['replace', 'remove', 'delete'] as const)('cleans the old photo after %s and tolerates cleanup failure', async mode => {
    const { api, replies, bucket, events } = mockClient();
    replies.push(response({ photo_path: 'uid/old.webp' }));
    bucket.remove.mockImplementationOnce(async () => {
      events.push('remove');
      throw new TypeError('Failed to fetch');
    });
    if (mode === 'delete') await api.reviews.remove('r');
    else {
      replies.push(response({ id: 'r' }));
      await api.reviews.update('r', input, mode === 'replace' ? photo : 'remove');
    }
    const sequence = mode === 'delete' ? ['row'] : mode === 'replace' ? ['row', 'upload', 'row'] : ['row', 'row'];
    expect(events).toEqual([...sequence, 'remove']);
    expect(bucket.remove).toHaveBeenCalledWith(['uid/old.webp']);
  });
});
