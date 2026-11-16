import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '@/app/routes';
import BrandLogo from '@/components/common/BrandLogo';
import Container from '@/components/common/Container';
import { BRAND } from '@/data/brand';
import { CAFE_LOCATION } from '@/data/cafe';

export default function Footer() {
  return (
    <footer className="bg-forest text-ivory">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <Link to={ROUTES.home} aria-label={`${BRAND.name} 홈으로`} className="inline-block rounded-full">
            <BrandLogo tone="light" showSubtitle />
          </Link>
          <p className="mt-6 max-w-sm font-serif text-lg leading-relaxed text-ivory/85">{BRAND.tagline}</p>
          <p className="mt-2 max-w-sm text-sm text-ivory/60">{BRAND.subTagline}</p>
        </div>

        <nav aria-label="하단 메뉴">
          <p className="text-eyebrow text-sage">Explore</p>
          <ul className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-ivory/80 transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-eyebrow text-sage">Visit</p>
          <p className="mt-4 flex gap-2 text-ivory/80">
            <MapPin aria-hidden className="mt-1.5 size-4 shrink-0 text-sage" />
            <span>{CAFE_LOCATION.address}</span>
          </p>
        </div>
      </Container>
      <div className="border-t border-ivory/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-ivory/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}
            {BRAND.isTemporaryName && ' (가칭)'}
          </p>
          <p>대학교 웹 프로그래밍 과제로 제작한 비상업 웹사이트입니다.</p>
        </Container>
      </div>
    </footer>
  );
}
