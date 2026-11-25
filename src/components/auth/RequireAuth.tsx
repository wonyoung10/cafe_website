import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useCommerce } from '@/contexts';
import PageLoader from '@/components/layout/PageLoader';
import { safeNextPath } from '@/utils/nextPath';

export default function RequireAuth() {
  const { status } = useAuth();
  const { configured } = useCommerce();
  const location = useLocation();
  if (configured && status === 'loading') return <PageLoader label="로그인 상태를 확인하고 있어요" />;
  if (configured && status === 'guest') {
    const next = safeNextPath(location.pathname + location.search + location.hash);
    return <Navigate to={'/login?next=' + encodeURIComponent(next)} replace />;
  }
  return <Outlet />;
}
