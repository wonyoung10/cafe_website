import { lazy, Suspense, useEffect, useState } from 'react';
import { ButtonLink } from '@/components/common/Button';
import Container from '@/components/common/Container';
import SectionHeading from '@/components/common/SectionHeading';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// 제목과 안내는 바로 보여 주고, 무거운 3D 묶음(three.js, 약 1MB)은 따로 내려받는다.
const StoreExperience = lazy(() => import('@/components/three/StoreExperience'));

/**
 * 3D 묶음을 해석하는 동안 메인 스레드가 수 초간 막힐 수 있다.
 * 제목이 먼저 화면에 그려진 다음 프레임에 불러오기 시작한다.
 */
function useAfterFirstPaint() {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setPainted(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  return painted;
}

function StoreExperienceLoading() {
  return (
    <div className="grid h-[calc(100svh-var(--header-height)-7rem)] min-h-[420px] place-items-center rounded-leaf-lg border border-line bg-cream sm:min-h-[480px]">
      <p role="status" aria-live="polite" className="rounded-leaf-sm border border-line bg-ivory px-6 py-4 text-sm font-medium text-forest shadow-soft">
        매장을 준비하고 있어요
      </p>
    </div>
  );
}

export default function StorePage() {
  useDocumentTitle('매장');
  const loadScene = useAfterFirstPaint();
  return (
    <Container as="section" className="py-8 md:py-10">
      <SectionHeading level={1} title="매장" description="햇살이 머무는 공간을 먼저 걸어보세요. 실제 매장 도면이 확정되기 전, 브랜드 콘셉트로 구성한 가상 공간이에요." className="mb-7" />
      {loadScene ? (
        <Suspense fallback={<StoreExperienceLoading />}>
          <StoreExperience />
        </Suspense>
      ) : (
        <StoreExperienceLoading />
      )}
      <div className="flex justify-center pt-7"><ButtonLink to="/location" variant="secondary" withArrow>오시는 길 보기</ButtonLink></div>
    </Container>
  );
}
