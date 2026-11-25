import { expect, it } from 'vitest';
import { commerceApiContract } from './commerceApi.contract';
import { createMemoryApi } from './memoryApi';

commerceApiContract('memoryApi', () => { localStorage.clear(); return createMemoryApi(); });

it('persists sessions and a different salted SHA-256 digest for each account', async () => {
  localStorage.clear();
  const api = createMemoryApi();
  await api.auth.signUp('account1', 'sample123');
  const last = await api.auth.signUp('account2', 'sample123');
  expect(await createMemoryApi().auth.getSession()).toEqual(last);
  const raw = localStorage.getItem('haru-leaf:memory')!;
  expect(raw).not.toContain('sample123');
  const { accounts } = JSON.parse(raw) as { accounts: { salt: string; digest: string }[] };
  expect(accounts[0]?.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(accounts[0]?.digest).not.toBe(accounts[1]?.digest);
  expect(accounts[0]?.salt).not.toBe(accounts[1]?.salt);
});
