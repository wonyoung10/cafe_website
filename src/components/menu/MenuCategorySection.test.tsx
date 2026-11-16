import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MenuCategorySection from './MenuCategorySection';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { getCategoryItems } from '@/utils/menu';

describe('MenuCategorySection', () => {
  it('카테고리 제목·소개를 보여 주고 대표 메뉴를 첫 카드로 둔다', () => {
    const tea = MENU_CATEGORIES.find(({ id }) => id === 'tea');
    if (!tea) throw new Error('tea category missing');
    render(<MenuCategorySection category={tea} items={getCategoryItems(MENU_ITEMS, 'tea')} />);

    const section = screen.getByRole('region', { name: /차/ });
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('차Tea');
    expect(within(section).getByText('천천히 우려내는 따뜻한 차')).toBeInTheDocument();
    const cards = within(section).getAllByRole('article');
    expect(cards).toHaveLength(4);
    expect(within(cards[0] as HTMLElement).getByRole('heading', { level: 3 })).toHaveTextContent('유자차');
  });
});
