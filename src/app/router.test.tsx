import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderWithRouter';

describe('AppRoutes', () => {
  it.each([
    ['/', '당신의 하루에, 잎사귀 하나.'],
    ['/menu', '메뉴소개'],
    ['/location', '오시는 길'],
  ])('%s 경로에서 페이지 제목(h1)을 렌더링한다', (path, heading) => {
    renderApp(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('/store 경로는 lazy 로딩 후 매장 페이지를 렌더링한다', async () => {
    renderApp('/store');
    expect(await screen.findByRole('heading', { level: 1, name: /매장/ })).toBeInTheDocument();
  });

  it('존재하지 않는 경로에서 404 페이지를 렌더링한다', () => {
    renderApp('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: /길을 잃은 잎사귀/ })).toBeInTheDocument();
  });

  it('헤더에 메뉴소개 · 매장 · 오시는 길 순서로 내비게이션이 있다', () => {
    renderApp('/');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    const links = within(nav).getAllByRole('link').map((link) => link.textContent);
    expect(links).toEqual(['메뉴소개', '매장', '오시는 길']);
  });

  it('현재 경로의 내비게이션 링크에 aria-current="page"를 표시한다', () => {
    renderApp('/menu');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    expect(within(nav).getByRole('link', { name: '메뉴소개' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: '매장' })).not.toHaveAttribute('aria-current');
  });

  it('헤더 링크를 클릭하면 해당 페이지로 이동한다', async () => {
    renderApp('/');
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    await userEvent.click(within(nav).getByRole('link', { name: '오시는 길' }));
    expect(screen.getByRole('heading', { level: 1, name: '오시는 길' })).toBeInTheDocument();
  });
});
