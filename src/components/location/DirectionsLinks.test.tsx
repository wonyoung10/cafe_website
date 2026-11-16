import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DirectionsLinks from './DirectionsLinks';
import { CAFE_LOCATION } from '@/data/cafe';

describe('DirectionsLinks', () => {
  it('links to the configured maps in a secure, announced new tab', () => {
    render(<DirectionsLinks />);
    const destinations = [
      ['네이버지도에서 길찾기', CAFE_LOCATION.naverMapUrl],
      ['카카오맵에서 길찾기', CAFE_LOCATION.kakaoMapUrl],
      ['OpenStreetMap에서 크게 보기', CAFE_LOCATION.mapViewUrl],
    ];
    for (const [name, href] of destinations) {
      const link = screen.getByRole('link', { name: new RegExp(`${name}\\s*\\(새 창\\)`) });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});
