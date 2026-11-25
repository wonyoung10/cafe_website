import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import StorePage from './StorePage';
vi.mock('@/utils/webgl', () => ({ isWebGLAvailable: () => false }));
it('provides the store heading, concept description, document title and location CTA', () => {
  renderWithRouter(<StorePage />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('매장');
  expect(screen.getByText('매장을 둘러봐요.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '오시는 길 보기' })).toHaveAttribute('href', '/location');
  expect(document.title).toContain('매장');
});
