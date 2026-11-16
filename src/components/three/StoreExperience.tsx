import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Footprints, Maximize, Orbit, RotateCcw, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { HOTSPOTS } from '@/data/hotspots';
import type { Hotspot, StoreMode } from '@/types/three';
import { isWebGLAvailable } from '@/utils/webgl';
import CameraRig, { type ViewRequest } from './controls/CameraRig';
import DirectionPad from './controls/DirectionPad';
import type { WalkInput } from './controls/WalkControls';
import LoadingOverlay from './LoadingOverlay';
import CafeScene from './scene/CafeScene';
import HotspotMarkers from './scene/HotspotMarkers';
import { DEFAULT_VIEW } from './scene/layout';
import { useMedia, useSceneVisible } from './useSceneEnvironment';
import WebGLFallback from './WebGLFallback';

const toolbarButton = 'flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-xs font-medium text-forest transition-colors hover:bg-sage-soft sm:text-sm';
const hints = {
  orbit: { desktop: '드래그: 회전 · 휠: 확대/축소 · 우클릭 드래그: 이동', touch: '한 손가락: 회전 · 두 손가락: 확대/이동' },
  walk: { desktop: 'W A S D / 방향키: 이동 · 드래그: 둘러보기 · Shift: 빠르게', touch: '방향 패드: 이동 · 드래그: 둘러보기' },
};

export default function StoreExperience() {
  const [supported] = useState(isWebGLAvailable);
  const [lost, setLost] = useState(false);
  const [mode, setMode] = useState<StoreMode>('orbit');
  const [active, setActive] = useState<Hotspot | null>(null);
  const [request, setRequest] = useState<ViewRequest>({ serial: 0, view: DEFAULT_VIEW });
  const [ready, setReady] = useState(false);
  const [lowDpr, setLowDpr] = useState(false);
  const [fullscreenSupported] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen));
  const [fullscreenError, setFullscreenError] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const input = useRef<WalkInput>({ forward: false, backward: false, left: false, right: false });
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const coarse = useMedia('(pointer: coarse)');
  const visible = useSceneVisible(frame);
  const markReady = useCallback(() => setReady(true), []);
  const select = useCallback((spot: Hotspot) => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setMode('orbit'); setActive(spot);
    setRequest((prev) => ({ serial: prev.serial + 1, view: spot.camera }));
  }, []);
  const closePanel = useCallback(() => {
    setActive(null);
    returnFocus.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!active) return;
    panel.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [active, closePanel]);
  // A capturing listener stays attached for the whole viewer lifetime, including Canvas replacement.
  useEffect(() => {
    const element = frame.current;
    const contextLost = (event: Event) => { event.preventDefault(); setLost(true); };
    element?.addEventListener('webglcontextlost', contextLost, true);
    return () => element?.removeEventListener('webglcontextlost', contextLost, true);
  }, []);
  const changeMode = (next: StoreMode) => {
    setMode(next); setActive(null);
    setRequest((prev) => ({ serial: prev.serial + 1, view: DEFAULT_VIEW }));
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement === frame.current) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
      setFullscreenError(false);
    } catch { setFullscreenError(true); }
  };
  if (!supported || lost) return <WebGLFallback />;
  return <ErrorBoundary fallback={<WebGLFallback />}>
    <div ref={frame} className="relative grid min-w-0 overflow-hidden rounded-[1.75rem] border border-line bg-cream lg:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="relative h-[calc(100svh-var(--header-height)-7rem)] min-h-[420px] bg-cream sm:min-h-[480px]">
        <Canvas aria-label="하루의 잎 가상 매장. 둘러보기와 실내 탐색이 가능한 3D 공간" shadows="soft" dpr={lowDpr ? 1 : [1, coarse ? 1.5 : 1.75]} frameloop={visible ? 'always' : 'never'} camera={{ position: DEFAULT_VIEW.position, fov: 60, near: 0.08, far: 45 }} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} style={{ touchAction: 'none' }}>
          <Suspense fallback={null}>
            <CafeScene coarse={coarse} />
            <HotspotMarkers activeId={active?.id} onSelect={select} />
            <CameraRig mode={mode} request={request} input={input} onReady={markReady} />
            <PerformanceMonitor onDecline={() => setLowDpr(true)} onFallback={() => setLowDpr(true)} />
          </Suspense>
        </Canvas>
        <div role="toolbar" aria-label="매장 조작" className="absolute top-3 right-3 left-3 z-30 flex flex-wrap items-center gap-1 sm:gap-2">
          <div role="group" aria-label="탐색 모드" className="flex rounded-full border border-line bg-ivory/95 p-1 shadow-soft">
            <button type="button" aria-pressed={mode === 'orbit'} onClick={() => changeMode('orbit')} className={`${toolbarButton} ${mode === 'orbit' ? 'bg-sage-soft' : ''}`}><Orbit aria-hidden className="size-4" />둘러보기</button>
            <button type="button" aria-pressed={mode === 'walk'} onClick={() => changeMode('walk')} className={`${toolbarButton} ${mode === 'walk' ? 'bg-sage-soft' : ''}`}><Footprints aria-hidden className="size-4" />실내 탐색</button>
          </div>
          <button type="button" onClick={() => changeMode('orbit')} className={`${toolbarButton} border border-line bg-ivory/95 shadow-soft`}><RotateCcw aria-hidden className="size-4" /><span className="sr-only sm:not-sr-only">시점 초기화</span></button>
          {fullscreenSupported && <button type="button" onClick={() => void fullscreen()} className={`${toolbarButton} border border-line bg-ivory/95 shadow-soft`}><Maximize aria-hidden className="size-4" /><span className="sr-only sm:not-sr-only">전체화면</span></button>}
        </div>
        {fullscreenError && <p role="status" className="absolute top-28 left-4 z-30 rounded-xl bg-ivory px-4 py-2 text-sm text-ink">전체화면을 열 수 없어요.</p>}
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-ivory/95 px-4 py-2 text-xs leading-relaxed text-ink-soft shadow-soft">{hints[mode][coarse ? 'touch' : 'desktop']}</p>
        {mode === 'walk' && coarse && <DirectionPad input={input} />}
        {active && <div ref={panel} tabIndex={-1} role="region" aria-labelledby="hotspot-title" className="absolute right-0 bottom-0 left-0 z-30 rounded-t-3xl border border-line bg-ivory p-6 shadow-lift sm:right-5 sm:bottom-16 sm:left-auto sm:max-w-xs sm:rounded-2xl">
          <button type="button" onClick={closePanel} aria-label="공간 설명 닫기" className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-forest hover:bg-sage-soft"><X aria-hidden className="size-5" /></button>
          <p className="text-eyebrow mb-2">A quiet corner</p><h2 id="hotspot-title" className="pr-7 font-serif text-xl font-bold text-forest">{active.title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">{active.description}</p>
        </div>}
        <LoadingOverlay ready={ready} />
      </div>
      <aside className="min-w-0 border-t border-line bg-ivory/95 p-4 lg:border-t-0 lg:border-l lg:p-5" aria-label="공간 둘러보기">
        <h2 className="mb-3 font-serif text-base font-bold text-forest">공간 둘러보기</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {HOTSPOTS.map((spot, index) => <button key={spot.id} type="button" aria-pressed={active?.id === spot.id} onClick={() => select(spot)} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${active?.id === spot.id ? 'border-forest bg-forest text-ivory' : 'border-line text-forest hover:bg-sage-soft'}`}><span aria-hidden className="text-xs opacity-70">0{index + 1}</span>{spot.title}</button>)}
        </div>
        <p className="mt-6 hidden text-xs leading-relaxed text-ink-soft lg:block">잎 모양 표시를 누르면<br />공간의 이야기를 만날 수 있어요.</p>
      </aside>
    </div>
  </ErrorBoundary>;
}
