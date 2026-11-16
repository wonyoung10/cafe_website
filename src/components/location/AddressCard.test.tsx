import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddressCard from './AddressCard';
import { CAFE_LOCATION } from '@/data/cafe';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AddressCard', () => {
  it('copies the address and announces success, then resets after two seconds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.useFakeTimers();
    render(<AddressCard />);
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    await act(async () => { await Promise.resolve(); });
    expect(writeText).toHaveBeenCalledWith(CAFE_LOCATION.address);
    expect(screen.getByRole('status')).toHaveTextContent('주소가 복사되었어요');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('uses the textarea fallback when Clipboard API rejects and restores focus', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(<AddressCard />);
    const button = screen.getByRole('button', { name: '주소 복사' });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('주소가 복사되었어요'));
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('announces actionable feedback if both copy methods fail', async () => {
    vi.stubGlobal('navigator', {});
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(false) });
    render(<AddressCard />);
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('복사하지 못했어요. 직접 선택해 복사해 주세요.'));
  });
});
