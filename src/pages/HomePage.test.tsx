import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './HomePage';
import { renderWithRouter } from '@/test/renderWithRouter';
import { BRAND } from '@/data/brand';
import { CAFE_LOCATION } from '@/data/cafe';

describe('HomePage', () => {
  it('shows the brand message, four featured menus, and exploration links', () => {
    renderWithRouter(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: BRAND.tagline })).toHaveTextContent(BRAND.tagline);
    expect(screen.getAllByRole('article')).toHaveLength(4);
    for (const [name, href] of [['메뉴 보기', '/menu'], ['전체 메뉴 보기', '/menu'], ['매장 둘러보기', '/store'], ['매장 들어가기', '/store'], ['오시는 길', '/location']]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    expect(screen.getByText(BRAND.philosophy)).toBeInTheDocument();
    expect(screen.getByText(CAFE_LOCATION.address)).toBeInTheDocument();
    expect(screen.queryByTestId('store-preview-stub')).not.toBeInTheDocument();
    expect(document.title).toBe('하루의 잎 — 당신의 하루에, 잎사귀 하나');
  });
});
