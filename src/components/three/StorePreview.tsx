import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import SmartImage from '@/components/common/SmartImage';
import { isWebGLAvailable } from '@/utils/webgl';
import CafeScene from './scene/CafeScene';
import { getTimeOfDay } from './scene/daylight';
import { DEFAULT_VIEW } from './scene/layout';
import { useMedia, useSceneVisible } from './useSceneEnvironment';

export interface StorePreviewProps { className?: string }
function PreviewCamera({ animate }: { animate: boolean }) {
  const { camera, invalidate } = useThree();
  const angle = useRef(0);
  useEffect(() => {
    invalidate();
    if (!animate) return;
    const timer = window.setInterval(invalidate, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [animate, invalidate]);
  useFrame((_, delta) => {
    if (animate) angle.current += Math.min(delta, 0.1) * 0.035;
    // A very slow full revolution, with an elliptical path kept inside the room.
    const a = angle.current + 0.85;
    camera.position.set(Math.sin(a) * 5.3, 2.6, Math.cos(a) * 3.8);
    camera.lookAt(0, 1, -0.8);
  });
  return null;
}
function PreviewPlaceholder() {
  return <SmartImage src="/images/store/store-fallback.webp" alt="원목 가구와 초록 식물이 어우러진 가상 매장" wrapperClassName="h-full w-full" />;
}
export default function StorePreview({ className }: StorePreviewProps) {
  const [supported] = useState(isWebGLAvailable);
  const [lost, setLost] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const visible = useSceneVisible(wrapper);
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');
  // 홈 미리보기는 지금 이 시각의 빛으로 보여 준다
  const [timeOfDay] = useState(() => getTimeOfDay());
  useEffect(() => {
    const element = wrapper.current;
    const onLost = (event: Event) => { event.preventDefault(); setLost(true); };
    element?.addEventListener('webglcontextlost', onLost, true);
    return () => element?.removeEventListener('webglcontextlost', onLost, true);
  }, []);
  return <div ref={wrapper} aria-label="하루의 잎 가상 매장 미리보기" data-time-of-day={timeOfDay} className={`h-full w-full overflow-hidden bg-cream ${className ?? ''}`}>
    {!supported || lost ? <PreviewPlaceholder /> : <ErrorBoundary fallback={<PreviewPlaceholder />}>
      <Canvas dpr={[1, 1.25]} frameloop={visible ? 'demand' : 'never'} camera={{ position: DEFAULT_VIEW.position, fov: 65, near: 0.08, far: 45 }} gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} style={{ pointerEvents: 'none' }} aria-hidden>
        <Suspense fallback={null}><CafeScene preview timeOfDay={timeOfDay} /><PreviewCamera animate={visible && !reduceMotion} /></Suspense>
      </Canvas>
    </ErrorBoundary>}
  </div>;
}
