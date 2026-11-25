import { defineConfig, devices } from '@playwright/test';

// 기본 빌드(소개 사이트, 회원 기능 미설정)와 메모리 백엔드 빌드를 서로 다른 포트·출력 폴더로 동시에 서빙한다.
// 포트는 다른 작업 트리의 서버와 겹칠 때 E2E_PORT / E2E_COMMERCE_PORT 환경 변수로 바꿀 수 있다.
const PORT = Number(process.env.E2E_PORT ?? 4173);
const COMMERCE_PORT = Number(process.env.E2E_COMMERCE_PORT ?? 4183);
// dist와 섞이지 않도록 node_modules/.cache(= .gitignore 대상) 아래에 따로 빌드한다.
const COMMERCE_DIST = 'node_modules/.cache/haru-commerce-memory';

// 프로젝트의 파일 집합은 서로 겹치지 않는다.
//  - desktop-chromium / mobile-chromium : tests/e2e/commerce 를 제외한 기존 스펙 (기본 빌드)
//  - commerce-desktop : tests/e2e/commerce 전체 중 unconfigured 제외 (메모리 빌드)
//  - commerce-mobile  : 위에서 viewport를 스스로 정하는 layout·keyboard 스펙도 제외 (메모리 빌드)
//  - commerce-default-build : unconfigured 스펙만 (기본 빌드)
const commerceSpecs = /[\\/]commerce[\\/].*\.spec\.ts$/;
const unconfiguredSpec = /[\\/]commerce[\\/]unconfigured\.spec\.ts$/;
const desktopOnlySpecs = [/[\\/]commerce[\\/]layout\.spec\.ts$/, /[\\/]commerce[\\/]keyboard\.spec\.ts$/];

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const commerceURL = `http://localhost:${COMMERCE_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // SwiftShader scenes compete for CPU/GPU resources; keep readiness checks reproducible.
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'desktop-chromium', testIgnore: commerceSpecs, use: desktop },
    { name: 'mobile-chromium', testIgnore: commerceSpecs, use: { ...devices['Pixel 7'] } },
    {
      name: 'commerce-desktop',
      testMatch: commerceSpecs,
      testIgnore: unconfiguredSpec,
      timeout: 60_000, // 가입·주문·리뷰를 화면으로 거치는 흐름이라 기본 30초는 빠듯하다
      use: { ...desktop, baseURL: commerceURL },
    },
    {
      name: 'commerce-mobile',
      testMatch: commerceSpecs,
      testIgnore: [unconfiguredSpec, ...desktopOnlySpecs],
      timeout: 60_000,
      use: { ...devices['Pixel 7'], baseURL: commerceURL },
    },
    { name: 'commerce-default-build', testMatch: unconfiguredSpec, use: desktop },
  ],
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `env VITE_COMMERCE_BACKEND=memory npx vite build --outDir ${COMMERCE_DIST} --emptyOutDir && npx vite preview --outDir ${COMMERCE_DIST} --port ${COMMERCE_PORT} --strictPort`,
      url: commerceURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
