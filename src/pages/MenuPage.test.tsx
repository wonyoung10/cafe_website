import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MenuPage from './MenuPage';
import { renderWithRouter } from '@/test/renderWithRouter';

function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><div data-testid="url">{location.pathname}{location.search}</div><button onClick={() => void navigate(-1)}>뒤로</button><button onClick={() => void navigate(1)}>앞으로</button></>;
}

describe('MenuPage', () => {
  it('filters Tea, pushes URL history, preserves unrelated params, and restores Back/Forward', async () => {
    renderWithRouter(<><MenuPage /><HistoryControls /></>, '/menu?source=home');
    await userEvent.click(screen.getByRole('button', { name: 'Tea 4' }));
    expect(screen.getByRole('button', { name: 'Tea 4' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('url')).toHaveTextContent('/menu?source=home&category=tea');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4));
    expect(screen.getByRole('status')).toHaveTextContent('4개의 메뉴');
    expect(screen.getByText('천천히 우려내는 따뜻한 차')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '전체 23' }));
    expect(screen.getByTestId('url')).toHaveTextContent('/menu?source=home');
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByRole('button', { name: 'Tea 4' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByRole('button', { name: '전체 23' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '앞으로' }));
    expect(screen.getByRole('button', { name: 'Tea 4' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([['dessert', 5], ['invalid', 23]])('loads category=%s directly with %i cards', (category, count) => {
    renderWithRouter(<MenuPage />, `/menu?category=${category}`);
    expect(screen.getAllByRole('article')).toHaveLength(count);
    expect(document.title).toBe('메뉴소개 · 하루의 잎');
  });
});
