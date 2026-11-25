import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { CartItem, SessionUser } from '@/types/commerce';
import type { CommerceApi } from './commerceApi';
import type { Database, OrderWithLines } from './database';
import { CommerceError, mapError } from './errors';
import { validateLoginId } from '@/utils/credentials';
import { checkCredentials, photoExtension, reviewBody } from './validation';

type Client = SupabaseClient<Database>;
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabaseConfigured = Boolean(url && key?.startsWith('sb_publishable_'));

let pendingClient: Promise<Client> | undefined;
function getClient(): Promise<Client> {
  if (!supabaseConfigured || !url || !key) return Promise.reject(new CommerceError('not-configured'));
  pendingClient ??= import('@supabase/supabase-js')
    .then(({ createClient }) => createClient<Database>(url, key))
    .catch(error => {
      pendingClient = undefined;
      throw mapError(error);
    });
  return pendingClient;
}

function sessionUser(user: User): SessionUser {
  const loginKey = user.email?.split('@')[0] ?? '';
  const candidate: unknown = user.user_metadata.login_id;
  return { id: user.id, loginId: typeof candidate === 'string' && candidate.toLowerCase() === loginKey ? candidate : loginKey };
}

type Operation = 'signup' | 'create-review' | 'photo';
async function result<T extends { data: unknown; error: unknown }>(request: PromiseLike<T>, operation?: Operation): Promise<T['data']> {
  try {
    const { data, error } = await request;
    if (error) throw error;
    return data;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (code === '23505') {
      if (operation === 'signup') throw new CommerceError('login-id-taken');
      if (operation === 'create-review') throw new CommerceError('already-reviewed');
    }
    if (operation === 'create-review' && (code === '42501' || code === '23503')) throw new CommerceError('not-purchased');
    throw mapError(error, operation === 'photo' ? 'photo-invalid' : 'unknown');
  }
}

function matched<T>(row: T): NonNullable<T> {
  if (row == null) throw new CommerceError('forbidden');
  return row;
}

async function session(client: Client) {
  const { session } = await result(client.auth.getSession());
  return session ? sessionUser(session.user) : null;
}

async function uid(client: Client) {
  const user = await session(client);
  if (!user) throw new CommerceError('not-authenticated');
  return user.id;
}

const bucket = (client: Client) => client.storage.from('review-photos');

async function upload(client: Client, userId: string, photo: Blob) {
  const path = userId + '/' + crypto.randomUUID() + '.' + photoExtension(photo);
  await result(bucket(client).upload(path, photo, { contentType: photo.type }), 'photo');
  return path;
}

async function discard(client: Client, path: string | null) {
  if (!path) return;
  try { await bucket(client).remove([path]); } catch { /* Cleanup is best effort. */ }
}

function cartRow(item: CartItem) {
  return { menu_id: item.menuId, temperature: item.temperature ?? '' as const, quantity: item.quantity };
}

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const orderColumns = 'id,order_no,total,receive_method,payment_method,payment_status,created_at,order_lines(menu_id,name,temperature,unit_price,quantity)';
function order(row: OrderWithLines) {
  return {
    id: row.id, orderNo: row.order_no, total: row.total, receiveMethod: row.receive_method,
    paymentMethod: row.payment_method, paymentStatus: row.payment_status, createdAt: row.created_at,
    lines: row.order_lines.map(line => ({
      menuId: line.menu_id, name: line.name, temperature: line.temperature || null, unitPrice: line.unit_price, quantity: line.quantity,
    })),
  };
}

export function createSupabaseApi(clientFor: () => Promise<Client> = getClient): CommerceApi {
  async function changeQuantity(rpc: 'add_cart_item' | 'set_cart_quantity', item: CartItem) {
    const client = await clientFor();
    await uid(client);
    try {
      await result(client.rpc(rpc, { p_menu_id: item.menuId, p_temperature: item.temperature ?? '', p_quantity: item.quantity }));
    } catch (error) {
      if (rpc === 'set_cart_quantity' && error instanceof CommerceError && error.code === 'not-found') {
        throw new CommerceError('forbidden');
      }
      throw error;
    }
  }

  return {
    auth: {
      async getSession() { return session(await clientFor()); },
      onChange(cb) {
        let active = true;
        let delivery: ReturnType<typeof setTimeout> | undefined;
        let unsubscribe: (() => void) | undefined;
        void clientFor().then(client => {
          if (!active) return;
          const { data } = client.auth.onAuthStateChange((_event, session) => {
            // Auth holds a lock during this callback. Subscribers can start cart RPCs.
            clearTimeout(delivery);
            delivery = setTimeout(() => { if (active) cb(session ? sessionUser(session.user) : null); }, 0);
          });
          unsubscribe = () => data.subscription.unsubscribe();
        }).catch(() => { if (active) cb(null); });
        return () => { active = false; clearTimeout(delivery); unsubscribe?.(); };
      },
      async signUp(loginId, password) {
        checkCredentials(loginId, password);
        const client = await clientFor();
        const email = loginId.toLowerCase() + '@id.cafewebsite-livid.vercel.app';
        const data = await result(client.auth.signUp({ email, password, options: { data: { login_id: loginId } } }), 'signup');
        if (!data.session) throw new CommerceError('not-configured', '가입을 마치려면 관리자가 Supabase에서 이메일 확인(Confirm email)을 꺼야 해요.');
        return sessionUser(data.session.user);
      },
      async logIn(loginId, password) {
        // 가입할 수 없는 형식의 아이디는 서버에 보내지 않고 같은 안내를 준다
        if (validateLoginId(loginId)) throw new CommerceError('credentials-mismatch');
        const client = await clientFor();
        const email = loginId.toLowerCase() + '@id.cafewebsite-livid.vercel.app';
        const { user } = await result(client.auth.signInWithPassword({ email, password }));
        if (!user) throw new CommerceError('credentials-mismatch');
        return sessionUser(user);
      },
      async logOut() {
        const client = await clientFor();
        try {
          const { error } = await client.auth.signOut();
          if (error) throw error;
        } catch (error) { throw mapError(error); }
      },
    },
    cart: {
      async list() {
        const client = await clientFor();
        const rows = await result(client.from('cart_items').select('menu_id,temperature,quantity').eq('user_id', await uid(client)));
        return (rows ?? []).map(row => ({ menuId: row.menu_id, temperature: row.temperature || null, quantity: row.quantity }));
      },
      add: item => changeQuantity('add_cart_item', item),
      setQuantity: item => changeQuantity('set_cart_quantity', item),
      async remove(menuId, temperature) {
        const client = await clientFor();
        matched(await result(client.from('cart_items').delete().eq('user_id', await uid(client)).eq('menu_id', menuId)
          .eq('temperature', temperature ?? '').select('menu_id').maybeSingle()));
      },
      async merge(items) {
        const client = await clientFor();
        await uid(client);
        await result(client.rpc('merge_cart', { p_items: items.map(cartRow) }));
      },
    },
    orders: {
      async place(receiveMethod, paymentMethod) {
        const client = await clientFor();
        await uid(client);
        const id = await result(client.rpc('place_order', { p_receive_method: receiveMethod, p_payment_method: paymentMethod }));
        if (!id) throw new CommerceError('unknown');
        return id;
      },
      async list() {
        const client = await clientFor();
        const rows = await result(client.from('orders').select(orderColumns).eq('user_id', await uid(client)).order('created_at', { ascending: false }));
        return (rows ?? []).map(order);
      },
      async get(id) {
        // uuid가 아닌 주소를 DB에 보내면 22P02 오류가 나므로 없는 주문으로 다룬다
        if (!uuidPattern.test(id)) return null;
        const client = await clientFor();
        const row = await result(client.from('orders').select(orderColumns).eq('user_id', await uid(client)).eq('id', id).maybeSingle());
        return row ? order(row) : null;
      },
    },
    reviews: {
      async list({ menuId, mineOnly, sort }) {
        const client = await clientFor();
        const rows = await result(client.rpc('list_reviews', { p_menu_id: menuId ?? null, p_mine: mineOnly ?? false, p_sort: sort ?? 'latest' }));
        return (rows ?? []).map(row => ({
          id: row.id, orderId: row.is_mine ? row.order_id : null, menuId: row.menu_id, rating: row.rating, text: row.body,
          photoUrl: row.photo_path ? bucket(client).getPublicUrl(row.photo_path).data.publicUrl : null,
          authorMasked: row.author_masked, isMine: row.is_mine, createdAt: row.created_at, updatedAt: row.updated_at,
        }));
      },
      async create(input, photo) {
        const body = reviewBody(input);
        const client = await clientFor();
        const userId = await uid(client);
        const path = photo ? await upload(client, userId, photo) : null;
        try {
          const row = await result(client.from('reviews').insert({
            user_id: userId, order_id: input.orderId, menu_id: input.menuId, rating: input.rating, body, photo_path: path,
          }).select('id').single(), 'create-review');
          if (!row) throw new CommerceError('unknown');
          return row.id;
        } catch (error) {
          await discard(client, path);
          throw error;
        }
      },
      async update(id, input, photo) {
        const body = reviewBody(input);
        const client = await clientFor();
        const userId = await uid(client);
        const table = client.from('reviews');
        const fields = { rating: input.rating, body };
        if (photo === 'keep') {
          matched(await result(table.update(fields).eq('id', id).eq('user_id', userId).select('id').maybeSingle()));
          return;
        }
        const old = matched(await result(table.select('photo_path').eq('id', id).eq('user_id', userId).maybeSingle()));
        const path = photo === 'remove' ? null : await upload(client, userId, photo);
        try {
          const update = table.update({ ...fields, photo_path: path }).eq('id', id).eq('user_id', userId);
          const unchanged = old.photo_path === null ? update.is('photo_path', null) : update.eq('photo_path', old.photo_path);
          matched(await result(unchanged.select('id').maybeSingle()));
        } catch (error) {
          await discard(client, path);
          throw error;
        }
        await discard(client, old.photo_path);
      },
      async remove(id) {
        const client = await clientFor();
        const row = matched(await result(client.from('reviews').delete().eq('id', id).eq('user_id', await uid(client)).select('photo_path').maybeSingle()));
        await discard(client, row.photo_path);
      },
    },
  };
}

export const supabaseApi = createSupabaseApi();
