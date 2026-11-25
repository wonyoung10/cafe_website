import { defineConfig } from 'vitest/config';

// 앱의 공통 setup은 window와 Element를 사용하므로 DB 검증은 Node 프로젝트에서 실행합니다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/tests/*.spec.ts'],
    hookTimeout: 30_000,
  },
});
