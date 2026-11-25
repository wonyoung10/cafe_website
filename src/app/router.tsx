import { lazy, Suspense, useMemo } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import RequireAuth from '@/components/auth/RequireAuth';
import PageLoader from '@/components/layout/PageLoader';
import RootLayout from '@/components/layout/RootLayout';
import { AuthProvider, CartProvider } from '@/contexts';
import { CommerceContext } from '@/contexts/commerce';
import { commerceApi, configured } from '@/services';
import type { CommerceApi } from '@/services/commerceApi';
import HomePage from '@/pages/HomePage';
import LocationPage from '@/pages/LocationPage';
import MenuPage from '@/pages/MenuPage';
import NotFoundPage from '@/pages/NotFoundPage';

// 회원·구매·리뷰 화면과 Three.js 코드는 해당 경로에 들어갈 때만 내려받는다 (RT-10)
const StorePage = lazy(() => import('@/pages/StorePage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const ReviewFormPage = lazy(() => import('@/pages/ReviewFormPage'));

function LazyOutlet() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageLoader label={pathname === '/store' ? '매장을 불러오는 중이에요' : undefined} />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function AppRoutes({ api }: { api?: CommerceApi }) {
  const commerce = useMemo(() => ({ api: api ?? commerceApi, configured: Boolean(api) || configured }), [api]);
  return (
    <CommerceContext.Provider value={commerce}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<HomePage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="location" element={<LocationPage />} />
              <Route element={<LazyOutlet />}>
                <Route path="store" element={<StorePage />} />
                <Route path="signup" element={<SignupPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="reviews/new" element={<ReviewFormPage />} />
                  <Route path="reviews/:reviewId/edit" element={<ReviewFormPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </CommerceContext.Provider>
  );
}
