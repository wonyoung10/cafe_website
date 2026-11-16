import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MenuFilter from './MenuFilter';
import { MENU_ITEMS } from '@/data/menu';
import { countByCategory } from '@/utils/menu';

describe('MenuFilter', () => {
  it('labels all five toggle buttons with counts and reports category selection', async () => {
    const onChange = vi.fn();
    render(<MenuFilter selected="tea" counts={countByCategory(MENU_ITEMS)} onChange={onChange} />);
    const group = screen.getByRole('group', { name: '메뉴 카테고리' });
    expect(within(group).getAllByRole('button')).toHaveLength(5);
    expect(within(group).getByRole('button', { name: 'Tea 4' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '전체 23' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(within(group).getByRole('button', { name: 'Coffee 8' }));
    expect(onChange).toHaveBeenCalledWith('coffee');
  });
});
