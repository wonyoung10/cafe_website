/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * 공유 미리보기(og:image)는 절대 URL이어야 한다. Vercel 빌드에서는
 * VERCEL_PROJECT_PRODUCTION_URL(예: haru-leaf.vercel.app)이 주어지므로 그 도메인을 붙인다.
 * SITE_URL을 직접 지정하면 그 값을 우선한다. 둘 다 없으면 상대 경로 그대로 둔다.
 */
function absoluteOgUrls(): Plugin {
  const raw = process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = raw ? (raw.startsWith('http') ? raw : `https://${raw}`).replace(/\/$/, '') : '';
  return {
    name: 'absolute-og-urls',
    transformIndexHtml(html) {
      if (!origin) return html;
      return html
        .replace(/(<meta property="og:image" content=")\//, `$1${origin}/`)
        .replace('</title>', `</title>\n    <meta property="og:url" content="${origin}/" />`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), absoluteOgUrls()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Vercel의 Supabase 연동은 공개 값에 NEXT_PUBLIC_을 붙인다. SUPABASE_로 시작하는 비밀 값은 노출하지 않는다.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_SUPABASE_'],
  server: { port: 5173 },
  preview: { port: 4173 },
  // three.js 청크(약 1MB)는 /store에서만 지연 로드되므로 경고 기준을 그 위로 둔다.
  build: { chunkSizeWarningLimit: 1100 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/**/*.test.ts'],
    css: false,
  },
});
