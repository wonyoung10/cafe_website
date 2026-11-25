import { expect, it } from 'vitest';
import { safeNextPath } from './nextPath';
it.each([null, undefined, '', 'https://evil', '//evil', '/\\evil', '/x\n', '/a\tb', '/a\u0000b',
  '/login?q=ok', '/signup/#hash', '/SIGNUP', '/a/../login', '/%6cogin', '/..//evil', '/%2fexample', '/%5cevil'])(
  'rejects %j', value => expect(safeNextPath(value)).toBe('/'));
it('preserves internal path, query and fragment', () => {
  expect(safeNextPath('/reviews/new?order=1&menu=tea#form')).toBe('/reviews/new?order=1&menu=tea#form');
});
