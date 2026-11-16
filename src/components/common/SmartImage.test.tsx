import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SmartImage from '@/components/common/SmartImage';

describe('SmartImage', () => {
  it('이미지 로드에 실패하면 잎사귀 플레이스홀더를 보여준다', () => {
    render(<SmartImage src="/missing.webp" alt="아메리카노 사진" />);
    fireEvent.error(screen.getByRole('img', { name: '아메리카노 사진' }));
    expect(screen.getByTestId('leaf-placeholder')).toHaveAttribute('aria-label', '아메리카노 사진');
  });

  it('기본적으로 lazy 로딩, priority면 eager 로딩한다', () => {
    const { rerender } = render(<SmartImage src="/a.webp" alt="a" />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
    rerender(<SmartImage src="/a.webp" alt="a" priority />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager');
  });

  it('이미 캐시되어 로드가 끝난 이미지도 표시한다 (load 이벤트 누락 대비)', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800);
    render(<SmartImage src="/cached.webp" alt="캐시 이미지" />);
    expect(screen.getByRole('img', { name: '캐시 이미지' })).toHaveClass('opacity-100');
    complete.mockRestore();
    width.mockRestore();
  });
});
