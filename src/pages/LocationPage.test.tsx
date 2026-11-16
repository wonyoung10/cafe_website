import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LocationPage from './LocationPage';
import { CAFE_LOCATION } from '@/data/cafe';
import { renderWithRouter } from '@/test/renderWithRouter';

describe('LocationPage', () => {
  it('uses the confirmed location and lazy map contract', () => {
    renderWithRouter(<LocationPage />, '/location');
    expect(screen.getByRole('heading', { name: '오시는 길', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(CAFE_LOCATION.description)).toBeInTheDocument();
    expect(screen.getByText(CAFE_LOCATION.notice)).toBeInTheDocument();
    const map = screen.getByTitle('하루의 잎 위치 지도');
    expect(map).toHaveAttribute('src', CAFE_LOCATION.mapEmbedUrl);
    expect(map).toHaveAttribute('loading', 'lazy');
    expect(map).toHaveAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    expect(document.title).toBe('오시는 길 · 하루의 잎');
  });
});
