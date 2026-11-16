import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '@/app/router';

export function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

export function renderWithRouter(ui: ReactElement, initialPath = '/') {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}
