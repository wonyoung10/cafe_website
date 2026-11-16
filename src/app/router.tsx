import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageLoader from '@/components/layout/PageLoader';
import RootLayout from '@/components/layout/RootLayout';
import HomePage from '@/pages/HomePage';
import LocationPage from '@/pages/LocationPage';
import MenuPage from '@/pages/MenuPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Three.js 관련 코드는 /store 진입 시에만 내려받도록 분리 (RT-10)
const StorePage = lazy(() => import('@/pages/StorePage'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route
          path="store"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader label="매장을 불러오는 중이에요" />}>
                <StorePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route path="location" element={<LocationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
