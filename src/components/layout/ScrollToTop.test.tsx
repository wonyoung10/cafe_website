import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/components/layout/ScrollToTop';

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
});
