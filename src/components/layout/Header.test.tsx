import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderWithRouter';

describe('Header', () => {
  it('로고 링크를 누르면 홈으로 이동한다', async () => {
    renderApp('/menu');
    const banner = screen.getByRole('banner');
    await userEvent.click(within(banner).getByRole('link', { name: '하루의 잎 홈으로' }));
    expect(screen.getByRole('heading', { level: 1, name: '당신의 하루에, 잎사귀 하나.' })).toBeInTheDocument();
  });

  it('모바일 메뉴 버튼으로 메뉴를 열고, 링크를 누르면 닫힌다', async () => {
    renderApp('/');
    const toggle = screen.getByRole('button', { name: '메뉴 열기' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toHaveAttribute('aria-expanded', 'true');

    const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' });
    await userEvent.click(within(mobileNav).getByRole('link', { name: '매장' }));
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('ESC 키로 모바일 메뉴를 닫는다', async () => {
    renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
  });
});
