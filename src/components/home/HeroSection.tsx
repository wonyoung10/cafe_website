import { useMemo } from 'react';
import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import LeafShade from '@/components/common/LeafShade';
import Section from '@/components/common/Section';
import SmartImage from '@/components/common/SmartImage';
import { BRAND } from '@/data/brand';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatToday, toDateAttribute } from '@/utils/today';

export default function HeroSection() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const now = useMemo(() => new Date(), []);
  const [first, second] = BRAND.tagline.split(', ');
  return (
    <Section
      className="relative isolate overflow-x-clip pt-10 pb-16 md:pt-14 md:pb-24 lg:py-0"
      containerClassName="grid items-center gap-10 lg:min-h-[min(46rem,calc(100svh-var(--header-height)))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16"
    >
      <LeafShade className="inset-y-0 left-0 w-full opacity-[0.13] lg:w-[64%]" />
      <div className="min-w-0 lg:py-16">
        <p className="font-serif text-base text-walnut md:text-lg">
          <time dateTime={toDateAttribute(now)}>{formatToday(now)}</time>, 오늘의 작은 쉼
        </p>
        <h1 className="text-display mt-5 text-forest md:mt-7">
          {first},{' '}
          <br className="hidden sm:block" />
          {second}
        </h1>
        <p className="mt-6 max-w-sm text-ink-soft md:mt-8">{BRAND.subTagline}</p>
        <div className="mt-8 flex flex-wrap gap-3 md:mt-10">
          <ButtonLink to={ROUTES.menu} size="lg">메뉴 보기</ButtonLink>
          <ButtonLink to={ROUTES.store} size="lg" variant="secondary" withArrow>매장 둘러보기</ButtonLink>
        </div>
      </div>
      <div className="relative min-w-0 lg:mr-[min(-2rem,calc((72rem-100vw)/2-2rem))] lg:self-stretch lg:py-8">
        <SmartImage
          key={desktop ? 'portrait' : 'wide'}
          src={desktop ? '/images/hero/hero-portrait.webp' : '/images/hero/hero-wide.webp'}
          alt="햇살 드는 원목 테이블 위의 커피와 잎사귀"
          priority
          wrapperClassName="aspect-[4/3] rounded-leaf-lg sm:aspect-video lg:aspect-auto lg:h-full lg:rounded-[2.75rem_0_0_0.75rem]"
        />
      </div>
    </Section>
  );
}
