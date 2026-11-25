import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

// 루트 npm test에서도 실제 Node 전용 SQL 테스트 전체를 실행하고 실패 출력을 전달합니다.
test('Supabase 스키마와 역할별 SQL 정책', async () => {
  const cli = resolve('node_modules/vitest/vitest.mjs');
  await promisify(execFile)(process.execPath, [cli, 'run', '--config', 'supabase/tests/vitest.config.ts']);
}, 60_000);
