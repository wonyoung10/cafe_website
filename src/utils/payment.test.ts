import { beforeEach, expect, it, vi } from 'vitest';
import { INSTRUMENTS } from '@/data/payments';
import { readReceipt, saveReceipt } from '@/services/paymentRecords';
import { approvalNumber, installmentOptions, instrumentFor } from './payment';

beforeEach(() => localStorage.clear());

it('derives a stable eight-digit approval number from the order id', () => {
  const id = '3f1c9a52-7d0e-4b6a-9c1d-2e8f5a7b9c01';
  expect(approvalNumber(id)).toMatch(/^\d{8}$/);
  expect(approvalNumber(id)).toBe(approvalNumber(id));
  expect(approvalNumber(id)).not.toBe(approvalNumber(id.replace('3f', '4f')));
});

it('offers installments only to credit cards from 50,000 won', () => {
  expect(installmentOptions(instrumentFor('ring-credit'), 49_999)).toEqual([0]);
  expect(installmentOptions(instrumentFor('ring-credit'), 50_000)).toEqual([0, 2, 3, 6]);
  expect(installmentOptions(instrumentFor('branch-check'), 50_000)).toEqual([0]);
  expect(installmentOptions(instrumentFor('dew-pay'), 50_000)).toEqual([0]);
  expect(installmentOptions(null, 50_000)).toEqual([0]);
});

it('uses only fictional instruments without a full card number', () => {
  const text = JSON.stringify(INSTRUMENTS);
  expect(text).not.toMatch(/\d{5,}(?!,)-|\d{12,}/);
  expect(text).not.toMatch(/신한|삼성|현대|롯데|국민|하나|우리|농협|비씨|토스|카카오|네이버|페이코|애플|visa|master/i);
});

it('keeps only the instrument id and months of the latest receipts and survives blocked storage', () => {
  saveReceipt('a', { instrumentId: 'dew-pay', months: 0 });
  expect(readReceipt('a')).toEqual({ instrumentId: 'dew-pay', months: 0 });
  for (let i = 0; i < 120; i++) saveReceipt('order' + i, { instrumentId: 'ring-credit', months: 3 });
  expect(readReceipt('a')).toBeNull();
  expect(readReceipt('order119')).toEqual({ instrumentId: 'ring-credit', months: 3 });
  localStorage.setItem('haru-leaf:payment-receipts', '{bad');
  expect(readReceipt('order119')).toBeNull();
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => saveReceipt('b', { instrumentId: 'dew-pay', months: 0 })).not.toThrow();
  blocked.mockRestore();
});
