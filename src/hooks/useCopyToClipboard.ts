import { useCallback, useEffect, useRef, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'error';

function copyWithTextarea(text: string): boolean {
  const focused = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i)) : [];
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.append(textarea);
  try {
    textarea.select();
    return document.execCommand('copy');
  } finally {
    textarea.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}

export function useCopyToClipboard() {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  useEffect(() => () => {
    request.current += 1;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (text: string) => {
    const currentRequest = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    let copied: boolean;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      try {
        copied = copyWithTextarea(text);
      } catch {
        copied = false;
      }
    }
    if (currentRequest !== request.current) return;
    setStatus(copied ? 'copied' : 'error');
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }, []);

  return { copy, status };
}
