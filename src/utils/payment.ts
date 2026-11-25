import { INSTALLMENT_MINIMUM, INSTALLMENT_MONTHS, INSTRUMENTS, type Instrument } from '@/data/payments';

export function instrumentFor(id: string | null | undefined): Instrument | null {
  return INSTRUMENTS.find(instrument => instrument.id === id) ?? null;
}

/** 할부는 신용카드로 5만원 이상 결제할 때만 고를 수 있다 (0 = 일시불) */
export function installmentOptions(instrument: Instrument | null, total: number): readonly number[] {
  return instrument?.installments && total >= INSTALLMENT_MINIMUM ? INSTALLMENT_MONTHS : [0];
}

export function installmentLabel(months: number) {
  return months ? months + '개월 할부' : '일시불';
}

/**
 * 모의 승인 번호(8자리). 주문 id에서 계산하므로 DB에 따로 저장하지 않아도 어느 기기에서나 같은 번호가 나온다.
 */
export function approvalNumber(orderId: string) {
  let hash = 0x811c9dc5;
  for (const char of orderId) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return String(hash % 100_000_000).padStart(8, '0');
}

/** 화면에서 기다리는 시간(ms). 단위 테스트에서 줄여 쓴다. */
export const paymentTiming = {
  /** 승인 요청을 보내는 동안 최소로 보여 주는 시간 */
  approval: 1400,
  /** 승인 완료를 보여 준 뒤 주문 화면으로 넘어가기까지 */
  approved: 1500,
  /** 인증을 기다리는 시간 */
  verify: 180_000,
  /** 주문 저장 응답을 기다리는 최대 시간 */
  response: 20_000,
  /** 끊긴 결제를 다시 확인하기 전 기다리는 시간 */
  recheck: 1500,
};

export function wait(ms: number) {
  return new Promise<void>(resolve => { setTimeout(resolve, ms); });
}
