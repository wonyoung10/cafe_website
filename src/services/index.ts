import { memoryApi } from './memoryApi';
import { supabaseApi, supabaseConfigured } from './supabaseApi';

const memory = import.meta.env.VITE_COMMERCE_BACKEND === 'memory';
export const commerceApi = memory ? memoryApi : supabaseApi;
export const configured = memory || supabaseConfigured;
