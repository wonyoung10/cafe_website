import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWebGLAvailable } from './webgl';
afterEach(() => vi.restoreAllMocks());
describe('WebGL detection', () => {
  it('returns false when jsdom cannot provide either context', () => {
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
    expect(context.mock.calls.map((call) => call[0])).toEqual(['webgl2', 'webgl']);
  });
  it('handles browsers where context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('unsupported'); });
    expect(isWebGLAvailable()).toBe(false);
  });
});
