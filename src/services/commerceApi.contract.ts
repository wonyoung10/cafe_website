import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENU_ITEMS } from '@/data/menu';
import type { CartItem, PaymentMethod, ReceiveMethod } from '@/types/commerce';
import type { CommerceApi } from './commerceApi';

export function commerceApiContract(name: string, fresh: () => CommerceApi) {
  describe(name, () => {
    let api: CommerceApi;
    const coffee: CartItem = { menuId: 'americano', temperature: 'ice', quantity: 2 };
    const signup = () => api.auth.signUp('Coffee12', 'abc123');
    const order = async () => {
      await signup();
      await api.cart.add(coffee);
      return api.orders.place('takeout', 'online');
    };
    const input = { rating: 4, text: '  고소해요  ' };
    beforeEach(() => { api = fresh(); });

    it('preserves display case, rejects duplicate IDs, and publishes only session fields', async () => {
      const changed = vi.fn();
      const off = api.auth.onChange(changed);
      const user = await signup();
      expect(user).toEqual({ id: expect.any(String), loginId: 'Coffee12' });
      expect(await api.auth.getSession()).toEqual(user);
      await expect(api.auth.signUp('coffee12', '123456')).rejects.toMatchObject({ code: 'login-id-taken' });
      await api.auth.logOut();
      expect(changed).toHaveBeenCalledWith(null);
      await expect(api.auth.logIn('coffee12', 'abcdef')).rejects.toMatchObject({ code: 'credentials-mismatch' });
      expect(await api.auth.logIn('COFFEE12', 'abc123')).toEqual(user);
      off();
      changed.mockClear();
      await api.auth.logOut();
      expect(changed).not.toHaveBeenCalled();
    });

    it('rejects invalid signup and member operations by guests', async () => {
      await expect(api.auth.signUp('abc', '123456')).rejects.toMatchObject({ code: 'login-id-invalid' });
      await expect(api.auth.signUp('abcd', 'abc!12')).rejects.toMatchObject({ code: 'password-invalid' });
      for (const operation of [() => api.cart.list(), () => api.cart.add(coffee), () => api.orders.get('missing'), () => api.orders.list()]) {
        await expect(operation()).rejects.toMatchObject({ code: 'not-authenticated' });
      }
      expect(await api.reviews.list({})).toEqual([]);
    });

    it('merges atomically, validates quantities and temperatures, and caps at 20 per variant', async () => {
      await signup();
      for (const quantity of [0, -1, 21, 1.5]) {
        await expect(api.cart.add({ ...coffee, quantity })).rejects.toMatchObject({ code: 'quantity-invalid' });
      }
      await expect(api.cart.merge([coffee, { ...coffee, menuId: 'missing' }])).rejects.toMatchObject({ code: 'menu-unknown' });
      await expect(api.cart.add({ ...coffee, temperature: null })).rejects.toMatchObject({ code: 'temperature-invalid' });
      expect(await api.cart.list()).toEqual([]);
      await api.cart.merge([coffee, { ...coffee, quantity: 20 }, { ...coffee, temperature: 'hot' }]);
      expect(await api.cart.list()).toEqual(expect.arrayContaining([{ ...coffee, quantity: 20 }, { ...coffee, temperature: 'hot' }]));
      await api.cart.setQuantity(coffee);
      await api.cart.remove(coffee.menuId, 'hot');
      expect(await api.cart.list()).toEqual([coffee]);
      await expect(api.cart.remove(coffee.menuId, 'hot')).rejects.toMatchObject({ code: 'forbidden' });
      await expect(api.cart.setQuantity({ ...coffee, temperature: 'hot' })).rejects.toMatchObject({ code: 'forbidden' });
    });

    it.each([['dine-in', 'online'], ['dine-in', 'onsite'], ['takeout', 'online'], ['takeout', 'onsite']] as const)(
      'places one %s / %s order from catalog prices', async (receive, payment) => {
        await signup();
        await api.cart.add(coffee);
        const price = MENU_ITEMS.find(item => item.id === coffee.menuId)!.price;
        const results = await Promise.allSettled([api.orders.place(receive, payment), api.orders.place(receive, payment)]);
        const id = results.find(result => result.status === 'fulfilled')?.value;
        expect(results).toContainEqual({ status: 'rejected', reason: expect.objectContaining({ code: 'cart-empty' }) });
        const receipt = await api.orders.get(id!);
        expect(receipt).toMatchObject({ id, total: price * 2, receiveMethod: receive, paymentMethod: payment,
          paymentStatus: payment === 'online' ? 'mock-paid' : 'onsite-due', lines: [{ ...coffee, unitPrice: price }] });
        expect(await api.orders.list()).toEqual([receipt]);
        expect(await api.cart.list()).toEqual([]);
        await api.auth.signUp('other1', 'abcdef');
        expect(await api.orders.get(id!)).toBeNull();
        expect(await api.orders.list()).toEqual([]);
      });

    it('refuses invalid order methods without consuming the cart', async () => {
      await signup();
      await api.cart.add(coffee);
      await expect(api.orders.place('other' as ReceiveMethod, 'onsite')).rejects.toMatchObject({ code: 'method-invalid' });
      await expect(api.orders.place('takeout', 'other' as PaymentMethod)).rejects.toMatchObject({ code: 'method-invalid' });
      expect(await api.cart.list()).toEqual([coffee]);
    });

    it('restricts reviews to one per purchased menu, and masks public results', async () => {
      const orderId = await order();
      const review = { ...input, orderId, menuId: coffee.menuId };
      await expect(api.reviews.create({ ...review, menuId: 'espresso' }, null)).rejects.toMatchObject({ code: 'not-purchased' });
      const id = await api.reviews.create(review, null);
      await expect(api.reviews.create(review, null)).rejects.toMatchObject({ code: 'already-reviewed' });
      expect(await api.reviews.list({ mineOnly: true })).toMatchObject([{ id, isMine: true, orderId, text: '고소해요' }]);
      await api.auth.logOut();
      const [row] = await api.reviews.list({});
      expect(row).toMatchObject({ id, isMine: false, orderId: null, authorMasked: 'Coffee**' });
      expect(Object.keys(row!).sort()).toEqual(['id','orderId','menuId','rating','text','photoUrl','authorMasked','isMine','createdAt','updatedAt'].sort());
      expect(await api.reviews.list({ mineOnly: true })).toEqual([]);
      await api.auth.signUp('other1', 'abcdef');
      await expect(api.reviews.create(review, null)).rejects.toMatchObject({ code: 'not-purchased' });
      await expect(api.reviews.update(id, input, 'remove')).rejects.toMatchObject({ code: 'forbidden' });
      await expect(api.reviews.remove(id)).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('filters reviews by menu and sorts by rating in both directions', async () => {
      const first = await order();
      await api.reviews.create({ ...input, orderId: first, menuId: coffee.menuId }, null);
      await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
      const second = await api.orders.place('dine-in', 'onsite');
      await api.reviews.create({ ...input, rating: 2, orderId: second, menuId: 'cookie' }, null);
      expect((await api.reviews.list({ sort: 'rating-high' })).map(row => row.rating)).toEqual([4, 2]);
      expect((await api.reviews.list({ sort: 'rating-low' })).map(row => row.rating)).toEqual([2, 4]);
      expect(await api.reviews.list({ menuId: 'cookie' })).toMatchObject([{ orderId: second, rating: 2 }]);
    });

    it('validates reviews and manages optional photos through edits and deletion', async () => {
      const orderId = await order();
      const review = { ...input, orderId, menuId: coffee.menuId };
      for (const rating of [0, 6, 1.5]) {
        await expect(api.reviews.create({ ...review, rating }, null)).rejects.toMatchObject({ code: 'rating-invalid' });
      }
      for (const text of ['  ', '가'.repeat(501)]) {
        await expect(api.reviews.create({ ...review, text }, null)).rejects.toMatchObject({ code: 'text-invalid' });
      }
      await expect(api.reviews.create(review, new Blob(['x'], { type: 'text/plain' }))).rejects.toMatchObject({ code: 'photo-invalid' });
      const photo = new Blob(['image'], { type: 'image/png' });
      const id = await api.reviews.create(review, photo);
      const first = (await api.reviews.list({}))[0]!;
      expect(first.photoUrl).toBeTruthy();
      await api.reviews.update(id, { rating: 5, text: '향이 좋아요' }, 'keep');
      expect((await api.reviews.list({}))[0]).toMatchObject({ rating: 5, photoUrl: first.photoUrl, updatedAt: expect.any(String) });
      await api.reviews.update(id, input, new Blob(['new'], { type: 'image/webp' }));
      expect((await api.reviews.list({}))[0]?.photoUrl).not.toBe(first.photoUrl);
      await api.reviews.update(id, input, 'remove');
      expect((await api.reviews.list({}))[0]?.photoUrl).toBeNull();
      await api.reviews.remove(id);
      expect(await api.reviews.list({})).toEqual([]);
      await expect(api.reviews.remove(id)).rejects.toMatchObject({ code: 'forbidden' });
    });
  });
}
