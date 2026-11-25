/**
 * 모의 결제에 쓰는 가상 결제수단. 실제 카드사·간편결제 회사와 관계가 없고 실제 카드번호도 아니다.
 * 한도(limit)를 넘는 금액은 승인 거절을 체험할 수 있게 일부러 작게 둔 것이 있다.
 */
export type InstrumentKind = 'card' | 'wallet';

export interface Instrument {
  id: string;
  kind: InstrumentKind;
  name: string;
  detail: string;
  /** 승인 가능한 최대 금액(원). 넘으면 거절된다 */
  limit: number;
  /** 할부 선택 가능 여부 (신용카드만) */
  installments: boolean;
  /** 카드 그림의 면 색 (Tailwind 클래스) */
  face: string;
}

export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'ring-credit', kind: 'card', name: '나이테카드', detail: '신용 · 가상 카드 0412', limit: 2_000_000, installments: true, face: 'bg-forest' },
  { id: 'branch-check', kind: 'card', name: '가지카드', detail: '체크 · 가상 카드 1130', limit: 300_000, installments: false, face: 'bg-walnut' },
  { id: 'fallen-credit', kind: 'card', name: '낙엽카드', detail: '신용 · 남은 한도 3,000원', limit: 3_000, installments: true, face: 'bg-bark' },
  { id: 'dew-pay', kind: 'wallet', name: '이슬페이', detail: '가상 잔액 100,000원', limit: 100_000, installments: false, face: 'bg-sage' },
  { id: 'vein-pay', kind: 'wallet', name: '잎맥페이', detail: '가상 잔액 1,000원', limit: 1_000, installments: false, face: 'bg-sprout' },
];

export const INSTALLMENT_MINIMUM = 50_000;
export const INSTALLMENT_MONTHS = [0, 2, 3, 6] as const;
