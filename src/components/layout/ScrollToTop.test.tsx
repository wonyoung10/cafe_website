import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/components/layout/ScrollToTop';

afterEach(() => vi.restoreAllMocks());

describe('ScrollToTop', () => {
  it('경로가 바뀌면 최상단으로 스크롤한다', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const { getByText } = render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <Routes>
          <Route path="/a" element={<Link to="/b">go</Link>} />
          <Route path="/b" element={<p>b</p>} />
        </Routes>
      </MemoryRouter>,
    );
    scrollTo.mockClear();
    await userEvent.click(getByText('go'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('퍼센트 인코딩된 해시의 요소로 스크롤한다', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const scrollTo = vi.spyOn(window, 'scrollTo').mockClear();
    render(<MemoryRouter initialEntries={['/menu#%EC%B0%A8']}><ScrollToTop /><section id="차">차</section></MemoryRouter>);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById('차'));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('해시 대상이 없으면 최상단으로 스크롤한다', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockClear();
    render(<MemoryRouter initialEntries={['/menu#missing']}><ScrollToTop /></MemoryRouter>);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('잘못 인코딩된 해시는 앱을 중단하지 않는다', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockClear();
    expect(() => render(<MemoryRouter initialEntries={['/menu#%E0%A4%A']}><ScrollToTop /></MemoryRouter>)).not.toThrow();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('쿼리만 바뀌면 스크롤 위치를 유지한다', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const { getByRole } = render(<MemoryRouter initialEntries={['/menu']}><ScrollToTop /><Link to="/menu?category=tea">Tea</Link></MemoryRouter>);
    scrollTo.mockClear();
    await userEvent.click(getByRole('link', { name: 'Tea' }));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
