import type { CartItem, Order, ReviewInput, SessionUser } from '@/types/commerce';
import { maskLoginId } from '@/utils/mask';
import { changeCart, menuFor } from './cartItems';
import type { CommerceApi } from './commerceApi';
import { CommerceError } from './errors';
import { checkCredentials, photoExtension, reviewBody } from './validation';

const KEY = 'haru-leaf:memory';
const sessionEvent = 'haru-leaf:memory-session';

interface Account extends SessionUser {
  salt: string;
  digest: string;
}

interface Review extends ReviewInput {
  id: string;
  userId: string;
  menuId: string;
  orderId: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Database {
  accounts: Account[];
  session: string | null;
  carts: Record<string, CartItem[]>;
  orders: { owner: string; order: Order }[];
  reviews: Review[];
}

function read(): Database {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : { accounts: [], session: null, carts: {}, orders: [], reviews: [] };
}

// Mutate a fresh snapshot, committing only after every validation succeeds.
async function write<T>(change: (db: Database) => T): Promise<T> {
  function commit() {
    const db = read();
    const result = change(db);
    localStorage.setItem(KEY, JSON.stringify(db));
    return result;
  }
  return navigator.locks ? navigator.locks.request(KEY, commit) : commit();
}

function current(db: Database): SessionUser | null {
  const account = db.accounts.find(account => account.id === db.session);
  return account ? { id: account.id, loginId: account.loginId } : null;
}

function owner(db: Database) {
  if (!db.session) throw new CommerceError('not-authenticated');
  return db.session;
}

async function writeAsMember<T>(change: (db: Database) => T): Promise<T> {
  const uid = owner(read());
  return write(db => {
    if (owner(db) !== uid) throw new CommerceError('forbidden');
    return change(db);
  });
}

function cart(db: Database) {
  return db.carts[owner(db)] ??= [];
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
}

async function digest(password: string, salt: string) {
  const data = new TextEncoder().encode(salt + password);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

function openSession(db: Database, account: Account) {
  db.session = account.id;
  return { id: account.id, loginId: account.loginId };
}

function announceSession() {
  window.dispatchEvent(new Event(sessionEvent));
}

function photoData(photo: Blob) {
  photoExtension(photo);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new CommerceError('photo-invalid'));
    reader.readAsDataURL(photo);
  });
}

function ownedReview(db: Database, id: string) {
  const uid = owner(db);
  const review = db.reviews.find(review => review.id === id && review.userId === uid);
  if (!review) throw new CommerceError('forbidden');
  return review;
}

export function createMemoryApi(): CommerceApi {
  return {
    auth: {
      async getSession() { return current(read()); },
      onChange(cb) {
        const notify = () => cb(current(read()));
        const storage = (event: StorageEvent) => {
          if (event.key === KEY || event.key === null) notify();
        };
        window.addEventListener(sessionEvent, notify);
        window.addEventListener('storage', storage);
        return () => {
          window.removeEventListener(sessionEvent, notify);
          window.removeEventListener('storage', storage);
        };
      },
      async signUp(loginId, password) {
        checkCredentials(loginId, password);
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        const account = { id: crypto.randomUUID(), loginId, salt, digest: await digest(password, salt) };
        const session = await write(db => {
          if (db.accounts.some(a => a.loginId.toLowerCase() === loginId.toLowerCase())) throw new CommerceError('login-id-taken');
          db.accounts.push(account);
          return openSession(db, account);
        });
        announceSession();
        return session;
      },
      async logIn(loginId, password) {
        const account = read().accounts.find(a => a.loginId.toLowerCase() === loginId.toLowerCase());
        if (!account || account.digest !== await digest(password, account.salt)) throw new CommerceError('credentials-mismatch');
        const session = await write(db => openSession(db, account));
        announceSession();
        return session;
      },
      async logOut() {
        await write(db => { db.session = null; });
        announceSession();
      },
    },
    cart: {
      async list() { return cart(read()); },
      add: item => writeAsMember(db => changeCart(cart(db), item, 'add')),
      setQuantity: item => writeAsMember(db => changeCart(cart(db), item, 'set')),
      remove: (menuId, temperature) => writeAsMember(db => changeCart(cart(db), { menuId, temperature, quantity: 1 }, 'remove')),
      merge: items => writeAsMember(db => {
        const lines = cart(db);
        for (const item of items) changeCart(lines, item, 'add');
      }),
    },
    orders: {
      place: (receiveMethod, paymentMethod) => writeAsMember(db => {
        const items = cart(db);
        if (!['takeout', 'dine-in'].includes(receiveMethod) || !['onsite', 'online'].includes(paymentMethod)) {
          throw new CommerceError('method-invalid');
        }
        if (!items.length) throw new CommerceError('cart-empty');
        const lines = items.map(item => {
          const { name, price } = menuFor(item.menuId);
          return { ...item, name, unitPrice: price };
        });
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const date = new Date(Date.parse(createdAt) + 9 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');
        db.orders.unshift({ owner: owner(db), order: {
          id, orderNo: date + '-' + String(db.orders.length + 1).padStart(6, '0'), lines,
          total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
          receiveMethod, paymentMethod, paymentStatus: paymentMethod === 'online' ? 'mock-paid' : 'onsite-due', createdAt,
        } });
        items.length = 0;
        return id;
      }),
      async list() {
        const db = read();
        const uid = owner(db);
        return db.orders.filter(entry => entry.owner === uid).map(entry => entry.order);
      },
      async get(id) {
        const db = read();
        const uid = owner(db);
        return db.orders.find(entry => entry.owner === uid && entry.order.id === id)?.order ?? null;
      },
    },
    reviews: {
      async list({ menuId, mineOnly, sort }) {
        const db = read();
        return db.reviews.filter(row => (!menuId || menuId === row.menuId) && (!mineOnly || row.userId === db.session))
          .sort((a, b) => {
            if (sort === 'rating-high' && a.rating !== b.rating) return b.rating - a.rating;
            if (sort === 'rating-low' && a.rating !== b.rating) return a.rating - b.rating;
            return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
          })
          .map(({ userId, orderId, ...fields }) => {
            const author = db.accounts.find(account => account.id === userId);
            const isMine = db.session === userId;
            return { ...fields, orderId: isMine ? orderId : null, authorMasked: maskLoginId(author?.loginId ?? ''), isMine };
          });
      },
      async create(input, photo) {
        const uid = owner(read());
        const text = reviewBody(input);
        const photoUrl = photo ? await photoData(photo) : null;
        return write(db => {
          if (owner(db) !== uid) throw new CommerceError('forbidden');
          const { orderId, menuId, rating } = input;
          const entry = db.orders.find(entry => entry.owner === uid && entry.order.id === orderId);
          if (!entry?.order.lines.some(line => line.menuId === menuId)) throw new CommerceError('not-purchased');
          if (db.reviews.some(row => row.orderId === orderId && row.menuId === menuId)) throw new CommerceError('already-reviewed');
          const id = crypto.randomUUID();
          db.reviews.push({ id, orderId, menuId, rating, text, userId: uid, photoUrl, createdAt: new Date().toISOString(), updatedAt: null });
          return id;
        });
      },
      async update(id, input, photo) {
        ownedReview(read(), id);
        const text = reviewBody(input);
        const photoUrl = typeof photo === 'string' ? null : await photoData(photo);
        await write(db => {
          const row = ownedReview(db, id);
          row.text = text;
          row.rating = input.rating;
          if (photo !== 'keep') row.photoUrl = photoUrl;
          row.updatedAt = new Date().toISOString();
        });
      },
      remove: id => writeAsMember(db => {
        const row = ownedReview(db, id);
        db.reviews.splice(db.reviews.indexOf(row), 1);
      }),
    },
  };
}

export const memoryApi = /* @__PURE__ */ createMemoryApi();
