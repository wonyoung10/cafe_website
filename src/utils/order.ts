import type { CartItem, PaymentMethod, PaymentStatus, ReceiveMethod } from '@/types/commerce';

export const receiveLabels: Record<ReceiveMethod, string> = {
  takeout: '테이크아웃',
  'dine-in': '매장에서',
};

export const paymentLabels: Record<PaymentMethod, string> = {
  onsite: '현장 결제',
  online: '온라인 결제',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  'onsite-due': '현장에서 결제 예정',
  'mock-paid': '모의 결제 완료',
};

export function lineKey(line: Pick<CartItem, 'menuId' | 'temperature'>) {
  return line.menuId + '/' + (line.temperature ?? '');
}

export function lineName(name: string, temperature: CartItem['temperature']) {
  return temperature ? name + ' ' + temperature.toUpperCase() : name;
}

const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Seoul' });

export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso));
}
