import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { CommerceApi } from '@/services/commerceApi';
import type { SessionUser } from '@/types/commerce';
import { AuthContext, type AuthState } from './auth';
import { useCommerce } from './commerce';

function authStore(auth: CommerceApi['auth'], configured: boolean) {
  let state: AuthState = { status: configured ? 'loading' : 'guest', user: null };
  let version = 0;
  const listeners = new Set<() => void>();

  function publish(user: SessionUser | null) {
    state = { user, status: user ? 'member' : 'guest' };
    listeners.forEach(listener => listener());
  }

  async function identify(action: Promise<SessionUser>) {
    const ticket = ++version;
    const user = await action;
    if (version === ticket) publish(user);
    return user;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    connect() {
      if (!configured) return;
      let active = true;
      const ticket = ++version;
      const unsubscribe = auth.onChange(user => {
        if (active) { version++; publish(user); }
      });
      const initial = (user: SessionUser | null) => {
        if (active && (ticket === version || state.status === 'loading')) publish(user);
      };
      void auth.getSession().then(initial, () => initial(null));
      return () => { active = false; version++; unsubscribe(); };
    },
    actions: {
      signUp: (id: string, password: string) => identify(auth.signUp(id, password)),
      logIn: (id: string, password: string) => identify(auth.logIn(id, password)),
      async logOut() {
        const ticket = ++version;
        await auth.logOut();
        if (version === ticket) publish(null);
      },
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { api, configured } = useCommerce();
  const store = useMemo(() => authStore(api.auth, configured), [api, configured]);
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  useEffect(() => store.connect(), [store]);
  return <AuthContext.Provider value={{ ...state, ...store.actions }}>{children}</AuthContext.Provider>;
}
