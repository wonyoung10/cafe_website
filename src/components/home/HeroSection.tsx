import { ButtonLink } from '@/components/common/Button';
import { LeafMark } from '@/components/common/BrandLogo';
import Section from '@/components/common/Section';
import SmartImage from '@/components/common/SmartImage';
import { BRAND } from '@/data/brand';
import { ROUTES } from '@/app/routes';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function HeroSection() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  return (
    <Section className="pt-12 md:pt-16 lg:py-16" containerClassName="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="min-w-0 py-3 lg:py-12">
        <div className="mb-7 flex items-center gap-3">
          <span className="h-px w-8 bg-sage" aria-hidden />
          <p className="text-eyebrow">오늘의 작은 쉼</p>
        </div>
        <h1 className="text-display text-forest">{BRAND.tagline.split(', ')[0]},{' '}<br className="hidden lg:block" />{BRAND.tagline.split(', ')[1]}</h1>
        <p className="mt-6 max-w-sm text-ink-soft md:mt-8">{BRAND.subTagline}</p>
        <div className="mt-8 flex flex-wrap gap-3 md:mt-10">
          <ButtonLink to={ROUTES.menu}>메뉴 보기</ButtonLink>
          <ButtonLink to={ROUTES.store} variant="secondary" withArrow>매장 둘러보기</ButtonLink>
        </div>
        <div aria-hidden className="mt-12 hidden items-center gap-3 text-walnut lg:flex">
          <LeafMark className="size-7 text-sage" />
          <span className="text-xs tracking-[0.2em]">COFFEE, REST &amp; A LITTLE LEAF</span>
        </div>
      </div>
      <div className="relative min-w-0">
        <SmartImage key={desktop ? 'portrait' : 'wide'} src={desktop ? '/images/hero/hero-portrait.webp' : '/images/hero/hero-wide.webp'} alt="햇살 드는 원목 테이블 위의 커피와 잎사귀" priority wrapperClassName="aspect-video rounded-[2rem] lg:aspect-[4/5]" />
        <p className="mt-4 text-right text-xs tracking-wider text-walnut">한 잔의 여유, 하루의 잎</p>
      </div>
    </Section>
  );
}
