/// <reference lib="dom" />
import { expect, test as base } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';

// Only known external sources are exempt. Source-less errors still fail the test.
function ignoredExternalSource(source: string, message: string) {
  let url: URL;
  try { url = new URL(source); } catch { return false; }
  if (url.hostname === 'openstreetmap.org' || url.hostname.endsWith('.openstreetmap.org')) return true;
  const fontSource = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)
    || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/pretendard'));
  return fontSource && /net::ERR_|Failed to load resource|Failed to fetch|NetworkError/i.test(message);
}

export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page, baseURL }, run, testInfo) => {
    const errors: string[] = [];
    const origin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const onAppPage = () => {
      try { return new URL(page.url()).origin === origin; } catch { return false; }
    };
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== 'error' || !onAppPage()) return;
      const source = message.location().url;
      if (!ignoredExternalSource(source, message.text())) errors.push(`console: ${message.text()} (${source || 'unknown source'})`);
    };
    const onPageError = (error: Error) => {
      if (!onAppPage()) return;
      const stack = error.stack ?? '';
      const source = stack.match(/https?:\/\/[^\s)]+/)?.[0] ?? '';
      // An app stack takes precedence over any third-party URL in the error text.
      if (!stack.includes(`${origin}/`) && ignoredExternalSource(source, error.message)) return;
      errors.push(`pageerror: ${stack || error.message}`);
    };
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    try {
      await run(errors);
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      if (errors.length) await testInfo.attach('browser-errors', { body: errors.join('\n'), contentType: 'text/plain' });
      expect(errors, 'Same-origin browser errors').toEqual([]);
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
