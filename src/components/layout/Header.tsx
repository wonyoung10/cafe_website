import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '@/app/routes';
import AccountMenu from '@/components/auth/AccountMenu';
import CartButton from '@/components/cart/CartButton';
import BrandLogo from '@/components/common/BrandLogo';
import Container from '@/components/common/Container';
import { BRAND } from '@/data/brand';
import { cn } from '@/utils/cn';

function desktopLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'relative inline-flex h-11 min-w-11 items-center justify-center px-1 text-[0.9375rem] font-semibold transition-colors duration-200',
    'after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-4 after:-translate-x-1/2 after:rounded-[0.75rem_0.125rem] after:bg-sprout after:transition-transform after:duration-300 after:ease-[var(--ease-leaf)]',
    isActive ? 'text-forest after:scale-x-100' : 'text-ink-soft after:scale-x-0 hover:text-forest hover:after:scale-x-100',
  );
}

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex h-14 items-center justify-between rounded-leaf px-4 font-serif text-xl font-bold transition-colors',
    isActive ? 'bg-sage-soft text-forest' : 'text-ink hover:bg-cream',
  );
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const { pathname, search } = useLocation();
  const panelId = useId();

  // 라우트가 바뀌면 메뉴는 자동으로 닫힌 상태가 된다 (열린 위치를 기억하는 방식, effect 없이)
  const locationKey = pathname + search;
  const isMenuOpen = openedAt === locationKey;
  const closeMenu = () => setOpenedAt(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedAt(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-[var(--header-height)] border-b transition-[background-color,border-color] duration-300',
        isScrolled || isMenuOpen ? 'border-line bg-ivory/90 backdrop-blur-md' : 'border-transparent bg-ivory/70 backdrop-blur-sm',
      )}
    >
      <Container className="flex h-full items-center justify-between">
        <Link to={ROUTES.home} aria-label={`${BRAND.name} 홈으로`} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-leaf-sm" onClick={closeMenu}>
          <BrandLogo />
        </Link>

        <nav aria-label="주 메뉴" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-2 lg:gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={desktopLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 md:ml-4 lg:ml-8">
          <CartButton />
          <div className="hidden md:block"><AccountMenu /></div>
          <button
            type="button"
            className="-mr-2 grid size-11 place-items-center rounded-leaf-sm text-forest hover:bg-cream md:hidden"
            aria-expanded={isMenuOpen}
            aria-controls={panelId}
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setOpenedAt(isMenuOpen ? null : locationKey)}
          >
            {isMenuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
          </button>
        </div>
      </Container>

      {/* 모바일 메뉴 패널 */}
      <div
        id={panelId}
        hidden={!isMenuOpen}
        className="fixed inset-x-0 top-[var(--header-height)] bottom-0 md:hidden"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 size-full cursor-default bg-ink/20"
          onClick={closeMenu}
        />
        <nav aria-label="모바일 메뉴" className="relative border-b border-line bg-ivory px-5 pb-8 pt-4 shadow-lift">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={mobileLinkClass} onClick={closeMenu}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <AccountMenu variant="panel" />
          <p className="mt-6 px-4 text-sm text-ink-soft">{BRAND.subTagline}</p>
        </nav>
      </div>
    </header>
  );
}
