import type { Instrument } from '@/data/payments';
import { paymentTiming, wait } from '@/utils/payment';
import type { CartItem, Order, ReceiveMethod } from '@/types/commerce';
import { lineKey } from '@/utils/order';
import type { CommerceApi } from './commerceApi';
import { CommerceError, mapError } from './errors';
import { readAttempt, saveAttempt, saveReceipt, type PaymentAttempt } from './paymentRecords';

export type FailureCode = 'limit' | 'balance' | 'refused' | 'expired' | 'offline' | 'changed' | 'consumed' | 'unconfirmed' | 'rejected';

export interface Failure {
  code: FailureCode;
  title: string;
  message: string;
}

const failures: Record<FailureCode, Omit<Failure, 'code'>> = {
  limit: { title: '한도를 넘었어요', message: '카드의 남은 한도보다 큰 금액이에요. 다른 결제수단을 골라 주세요.' },
  balance: { title: '잔액이 부족해요', message: '남은 잔액보다 큰 금액이에요. 다른 결제수단을 골라 주세요.' },
  refused: { title: '인증을 거절했어요', message: '앱에서 결제를 거절해 승인을 요청하지 않았어요.' },
  expired: { title: '인증 시간이 지났어요', message: '정해진 시간 안에 인증하지 않아 결제를 멈췄어요.' },
  offline: { title: '연결이 끊겼어요', message: '승인을 요청하기 전에 연결이 끊겼어요. 연결 상태를 확인해 주세요.' },
  changed: { title: '장바구니가 바뀌었어요', message: '다른 창에서 담은 메뉴가 달라졌어요. 금액을 다시 확인해 주세요.' },
  consumed: { title: '이미 처리된 주문이에요', message: '장바구니가 비어 있어요. 다른 창에서 결제했는지 주문 내역을 확인해 주세요.' },
  unconfirmed: { title: '승인 결과를 확인하지 못했어요', message: '응답이 늦어지고 있어요. 다시 결제하기 전에 결과를 확인해 주세요.' },
  rejected: { title: '승인되지 않았어요', message: '처리하지 못했어요. 잠시 후 다시 시도해 주세요.' },
};

export function failure(code: FailureCode, message = failures[code].message): Failure {
  return { code, title: failures[code].title, message };
}

export type Outcome = { orderId: string } | { failure: Failure };

export interface PaymentRequest {
  userId: string;
  receive: ReceiveMethod;
  instrument: Instrument;
  months: number;
  total: number;
  items: CartItem[];
}

function signature(items: CartItem[]) {
  return items.map(item => lineKey(item) + '×' + item.quantity).sort().join();
}

function limited<T>(task: Promise<T>) {
  return Promise.race([
    task,
    wait(paymentTiming.response).then((): never => { throw new CommerceError('network'); }),
  ]);
}

function complete(userId: string, attempt: PaymentAttempt, orderId: string): Outcome {
  saveReceipt(orderId, attempt);
  saveAttempt(userId, null);
  return { orderId };
}

/** 결과를 받지 못한 승인 요청이 실제로 주문이 되었는지 확인한다. null이면 주문이 만들어지지 않았다. */
export async function settleAttempt(api: CommerceApi, userId: string): Promise<Outcome | null> {
  const attempt = readAttempt(userId);
  if (!attempt) return null;
  try {
    for (let tries = 0; tries < 2; tries++) {
      // 요청이 서버에 막 도착했을 수 있으므로 한 번 더 확인한다.
      if (tries) await wait(paymentTiming.recheck);
      const orders: Order[] = await limited(api.orders.list());
      const order = orders.find(order => !attempt.knownOrders.includes(order.id)
        && order.paymentMethod === 'online' && order.receiveMethod === attempt.receive);
      if (order) return complete(userId, attempt, order.id);
    }
  } catch {
    return { failure: failure('unconfirmed') };
  }
  saveAttempt(userId, null);
  return null;
}

/**
 * 모의 승인. 실제 결제사에는 아무것도 보내지 않고 주문 저장(place_order)만 호출한다.
 * 금액은 서버가 다시 계산하며, 여기서는 화면에서 본 장바구니와 같은지만 확인한다.
 */
export async function approvePayment(api: CommerceApi, request: PaymentRequest, stillOpen: () => boolean): Promise<Outcome> {
  const { userId, receive, instrument, months, total, items } = request;
  await wait(paymentTiming.approval);
  if (total > instrument.limit) return { failure: failure(instrument.kind === 'card' ? 'limit' : 'balance') };

  let knownOrders: string[];
  try {
    const [cart, orders] = await limited(Promise.all([api.cart.list(), api.orders.list()]));
    if (!cart.length) return { failure: failure('consumed') };
    if (signature(cart) !== signature(items)) return { failure: failure('changed') };
    knownOrders = orders.map(order => order.id);
  } catch (cause) {
    const error = mapError(cause);
    return { failure: error.code === 'network' || error.code === 'unknown' ? failure('offline') : failure('rejected', error.message) };
  }
  if (!stillOpen()) return { failure: failure('refused') };

  const attempt: PaymentAttempt = { receive, instrumentId: instrument.id, months, knownOrders };
  saveAttempt(userId, attempt);
  try {
    return complete(userId, attempt, await limited(api.orders.place(receive, 'online')));
  } catch (cause) {
    const error = mapError(cause);
    // 응답만 잃어버렸을 수 있는 오류는 주문이 생겼는지 확인한 뒤에 실패로 본다.
    if (error.code === 'network' || error.code === 'unknown') {
      return await settleAttempt(api, userId) ?? { failure: failure('rejected', error.message) };
    }
    saveAttempt(userId, null);
    return { failure: error.code === 'cart-empty' ? failure('consumed') : failure('rejected', error.message) };
  }
}
