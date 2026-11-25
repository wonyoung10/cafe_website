/** 연결에 쓰는 공개 환경 변수. 비밀 키 이름은 일부러 두지 않는다. */
export interface SupabaseEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Vercel의 Supabase 연동이 넣어 주는 이름 */
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

/** 예전 형식(JWT) 키는 역할이 anon일 때만 공개 키다. service_role이면 거절한다. */
function isAnonJwt(key: string): boolean {
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof claims === 'object' && claims !== null && 'role' in claims && claims.role === 'anon';
  } catch {
    return false;
  }
}

export function isPublicKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || isAnonJwt(key);
}

/** 직접 넣은 VITE_ 값을 먼저 쓰고, 없으면 Vercel 연동 값을 쓴다. 공개 키가 아니면 연결하지 않는다. */
export function readSupabaseConfig(env: SupabaseEnv): { url: string; key: string } | null {
  const clean = (value: string | undefined) => value?.trim() || undefined;
  const url = clean(env.VITE_SUPABASE_URL) ?? clean(env.NEXT_PUBLIC_SUPABASE_URL);
  const key = [env.VITE_SUPABASE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_SUPABASE_ANON_KEY]
    .map(clean)
    .find((value) => value !== undefined && isPublicKey(value));
  return url && key ? { url, key } : null;
}
