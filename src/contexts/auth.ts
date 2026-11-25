import { createContext, useContext } from 'react';
import type { CommerceApi } from '@/services/commerceApi';
import { CommerceError } from '@/services/errors';
import type { SessionUser } from '@/types/commerce';

export type AuthState = { status: 'loading' | 'guest' | 'member'; user: SessionUser | null };
type Auth = AuthState & Pick<CommerceApi['auth'], 'signUp' | 'logIn' | 'logOut'>;
const unavailable = async (): Promise<never> => { throw new CommerceError('not-configured'); };
export const AuthContext = createContext<Auth>({
  status: 'guest', user: null, signUp: unavailable, logIn: unavailable, logOut: async () => {},
});
export const useAuth = () => useContext(AuthContext);
