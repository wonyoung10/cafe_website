/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMERCE_BACKEND?: 'supabase' | 'memory';
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
