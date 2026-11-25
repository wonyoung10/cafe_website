import type { PaymentMethod, ReceiveMethod } from '@/types/commerce';

/**
 * 브라우저에만 남기는 모의 결제 기록. 카드번호 같은 결제 정보는 애초에 받지 않으므로
 * 여기에는 가상 결제수단의 id와 할부 개월만 들어간다.
 */
export interface PaymentChoice {
  instrumentId: string;
  months: number;
}

export interface CheckoutDraft {
  receive: ReceiveMethod | null;
  payment: PaymentMethod | null;
  instrumentId: string | null;
  months: number;
}

/** 승인 요청을 보낸 뒤 결과를 받기 전까지만 남는다. 새로고침해도 결과를 다시 확인할 수 있게 한다. */
export interface PaymentAttempt extends PaymentChoice {
  receive: ReceiveMethod;
  /** 요청 전에 이미 있던 주문. 여기에 없는 주문이 생겼으면 승인된 것이다 */
  knownOrders: string[];
}

const RECEIPTS = 'haru-leaf:payment-receipts';
const MAX_RECEIPTS = 100;
const draftKey = (userId: string) => 'haru-leaf:checkout-draft:' + userId;
const attemptKey = (userId: string) => 'haru-leaf:payment-attempt:' + userId;

// 저장소가 막힌 브라우저에서도 결제는 계속되어야 하므로 실패를 무시한다.
function load<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}

function save(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch { /* Storage can be unavailable. */ }
}

const session = () => sessionStorage;
const local = () => localStorage;

export const readDraft = (userId: string) => load<CheckoutDraft>(session, draftKey(userId));
export const saveDraft = (userId: string, draft: CheckoutDraft | null) => save(session, draftKey(userId), draft);
export const readAttempt = (userId: string) => load<PaymentAttempt>(session, attemptKey(userId));
export const saveAttempt = (userId: string, attempt: PaymentAttempt | null) => save(session, attemptKey(userId), attempt);

type Receipts = [orderId: string, choice: PaymentChoice][];

function receipts(): Receipts {
  const entries = load<Receipts>(local, RECEIPTS);
  return Array.isArray(entries) ? entries : [];
}

export function readReceipt(orderId: string): PaymentChoice | null {
  return receipts().find(entry => Array.isArray(entry) && entry[0] === orderId)?.[1] ?? null;
}

export function saveReceipt(orderId: string, { instrumentId, months }: PaymentChoice) {
  const rest = receipts().filter(entry => Array.isArray(entry) && entry[0] !== orderId);
  save(local, RECEIPTS, [[orderId, { instrumentId, months }], ...rest].slice(0, MAX_RECEIPTS));
}
