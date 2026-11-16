import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCopyToClipboard } from './useCopyToClipboard';

const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor);
  else Reflect.deleteProperty(document, 'execCommand');
});

describe('useCopyToClipboard', () => {
  it('Clipboard API가 없으면 선택된 텍스트를 보존하며 대체 복사를 한다', async () => {
    vi.stubGlobal('navigator', {});
    const paragraph = document.createElement('p');
    paragraph.textContent = '선택한 주소';
    document.body.append(paragraph);
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const execCommand = vi.fn(() => {
      expect(document.querySelector('textarea')?.value).toBe('경기도 안양시 동안구 경수대로 940');
      selection?.removeAllRanges();
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const { result } = renderHook(useCopyToClipboard);
    try {
      await act(() => result.current.copy('경기도 안양시 동안구 경수대로 940'));
      expect(result.current.status).toBe('copied');
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(selection?.toString()).toBe('선택한 주소');
      expect(document.querySelector('textarea')).toBeNull();
    } finally { paragraph.remove(); selection?.removeAllRanges(); }
  });

  it('대체 복사가 예외를 던져도 임시 요소를 제거하고 오류를 알린다', async () => {
    vi.stubGlobal('navigator', {});
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => { throw new Error('copy unavailable'); }) });
    const { result } = renderHook(useCopyToClipboard);
    await act(() => result.current.copy('주소'));
    expect(result.current.status).toBe('error');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('먼저 시작한 복사의 늦은 결과는 최신 피드백을 덮어쓰지 않는다', async () => {
    const earlier = deferred();
    const writeText = vi.fn().mockReturnValueOnce(earlier.promise).mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    const { result } = renderHook(useCopyToClipboard);
    let firstCopy: Promise<void> | undefined;
    act(() => { firstCopy = result.current.copy('이전 주소'); });
    await act(() => result.current.copy('최신 주소'));
    expect(result.current.status).toBe('copied');
    await act(async () => { earlier.reject(new Error('Denied')); await firstCopy; });
    expect(result.current.status).toBe('copied');
  });

  it('언마운트 이후 복사가 완료되어도 피드백 타이머를 만들지 않는다', async () => {
    vi.useFakeTimers();
    const pending = deferred();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => pending.promise) } });
    const { result, unmount } = renderHook(useCopyToClipboard);
    let copy: Promise<void> | undefined;
    act(() => { copy = result.current.copy('주소'); });
    unmount();
    await act(async () => { pending.resolve(); await copy; });
    expect(vi.getTimerCount()).toBe(0);
  });
});
