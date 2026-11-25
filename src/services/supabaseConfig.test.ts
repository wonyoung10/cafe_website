import { describe, expect, it } from 'vitest';
import { isPublicKey, readSupabaseConfig } from './supabaseConfig';

const jwt = (role: string) => `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ role }))}.signature`;
const url = 'https://project.supabase.co';

describe('readSupabaseConfig', () => {
  it('직접 넣은 VITE_ 값을 먼저 쓴다', () => {
    expect(readSupabaseConfig({
      VITE_SUPABASE_URL: ` ${url} `, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_a',
      NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_b',
    })).toEqual({ url, key: 'sb_publishable_a' });
  });

  it('없으면 Vercel 연동이 넣은 값을 쓰고, 예전 anon 키도 받는다', () => {
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_b' }))
      .toEqual({ url, key: 'sb_publishable_b' });
    const anon = jwt('anon');
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon })).toEqual({ url, key: anon });
  });

  it.each(['sb_secret_abc', jwt('service_role'), 'not-a-key', 'a.b.c', ''])('공개 키가 아니면 연결하지 않는다 (%#)', (key) => {
    expect(isPublicKey(key)).toBe(false);
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
  });

  it('값이 비면 연결하지 않는다', () => {
    expect(readSupabaseConfig({})).toBeNull();
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_a' })).toBeNull();
  });
});
