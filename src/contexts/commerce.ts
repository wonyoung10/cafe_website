import { createContext, useContext } from 'react';
import { commerceApi, configured } from '@/services';

export const CommerceContext = createContext({ api: commerceApi, configured });
export const useCommerce = () => useContext(CommerceContext);
