import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MenuCard from './MenuCard';
import { MENU_ITEMS } from '@/data/menu';

function itemById(id: string) {
  const item = MENU_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing fixture ${id}`);
  return item;
}

describe('MenuCard', () => {
  it('shows the menu identity, accessible image, and HOT/ICE badges', () => {
    render(<MenuCard item={itemById('americano')} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '아메리카노' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '아메리카노 사진' })).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('HOT')).toHaveClass('text-walnut');
    expect(screen.getByText('ICE')).toHaveClass('text-forest');
    expect(screen.getByText('4,800원')).toHaveAttribute('value', '4800');
  });
  it('shows the price on the large lead card too', () => {
    render(<MenuCard item={itemById('cheesecake')} variant="lead" />);
    expect(screen.getByText('7,000원')).toBeInTheDocument();
  });
  it('does not show temperature badges for dessert', () => {
    render(<MenuCard item={itemById('croissant')} />);
    expect(screen.queryByLabelText('제공 온도')).not.toBeInTheDocument();
    expect(screen.queryByText('HOT')).not.toBeInTheDocument();
    expect(screen.queryByText('ICE')).not.toBeInTheDocument();
    expect(screen.getByText('4,500원')).toBeInTheDocument();
  });
});
