import { lazy, Suspense } from 'react';
import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LeafPlaceholder from '@/components/common/LeafPlaceholder';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import { useInView } from '@/hooks/useInView';

const StorePreview = lazy(() => import('@/components/three/StorePreview'));

function PreviewFallback({ failed = false }: { failed?: boolean }) {
  return (
    <div className="relative size-full">
      <LeafPlaceholder />
      <p className="absolute inset-x-5 bottom-6 text-center text-sm text-ink-soft">{failed ? '미리보기를 불러오지 못했어요. 매장 페이지에서 공간을 만나 보세요.' : '햇살과 초록이 머무는 작은 쉼터'}</p>
    </div>
  );
}

export default function StorePreviewSection() {
  const { ref, inView } = useInView('200px');
  return (
    <Section tone="paper" aria-labelledby="store-preview-heading" containerClassName="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div>
        <SectionHeading id="store-preview-heading" title="햇살이 머무는 공간을 먼저 걸어보세요." description="원목의 온기와 식물의 초록 사이, 잠시 쉬어 갈 자리를 찾아보세요." />
        <ButtonLink to={ROUTES.store} className="mt-8" withArrow>매장 들어가기</ButtonLink>
      </div>
      <div ref={ref} className="aspect-[4/3] min-w-0 overflow-hidden rounded-[2rem] border border-line bg-cream shadow-soft md:aspect-[16/10]">
        {inView ? (
          <ErrorBoundary fallback={<PreviewFallback failed />}>
            <Suspense fallback={<PreviewFallback />}><StorePreview className="size-full" /></Suspense>
          </ErrorBoundary>
        ) : <PreviewFallback />}
      </div>
    </Section>
  );
}
