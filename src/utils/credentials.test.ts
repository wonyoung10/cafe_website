import { expect, it } from 'vitest';
import { validateLoginId, validatePassword } from './credentials';

it('accepts only 4–20 ASCII letters or digits for IDs', () => {
  for (const id of ['abcd', '1234', 'aZ09'.repeat(5)]) expect(validateLoginId(id)).toBeNull();
  for (const id of ['abc', 'a'.repeat(21), 'abc한', 'abcd ', 'a!bc']) expect(validateLoginId(id)).toEqual(expect.any(String));
});
it('accepts six or more letters or digits in passwords', () => {
  for (const pw of ['ABCdef', '123456', 'password123']) expect(validatePassword(pw)).toBeNull();
  for (const pw of ['12345', 'abc!12', '비밀번호1', 'abc 12']) expect(validatePassword(pw)).toEqual(expect.any(String));
});
