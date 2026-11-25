import { expect, it } from 'vitest';
import { maskLoginId } from './mask';
it('masks the final two characters', () => {
  expect(maskLoginId('coffee12')).toBe('coffee**');
  expect(maskLoginId('ABcd')).toBe('AB**');
});
