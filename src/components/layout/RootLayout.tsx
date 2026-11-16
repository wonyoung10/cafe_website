import { Outlet } from 'react-router-dom';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import ScrollToTop from '@/components/layout/ScrollToTop';
import SkipLink from '@/components/layout/SkipLink';

export default function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollToTop />
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
