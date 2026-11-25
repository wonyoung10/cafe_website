import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '@/app/router';
import type { CommerceApi } from '@/services/commerceApi';

export function renderApp(initialPath = '/', { api }: { api?: CommerceApi } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes api={api} />
    </MemoryRouter>,
  );
}

export function renderWithRouter(ui: ReactElement, initialPath = '/') {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}
