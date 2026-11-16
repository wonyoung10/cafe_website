import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('NotFoundPage', () => {
  it('offers home and menu recovery links', () => {
    renderWithRouter(<NotFoundPage />, '/missing');
    expect(screen.getByRole('heading', { level: 1, name: '길을 잃은 잎사귀예요' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '메뉴 보기' })).toHaveAttribute('href', '/menu');
    expect(document.title).toBe('페이지를 찾을 수 없어요 · 하루의 잎');
  });
});
