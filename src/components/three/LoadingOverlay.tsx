import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';

export default function LoadingOverlay({ ready }: { ready: boolean }) {
  const { active, progress } = useProgress();
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [removed, setRemoved] = useState(false);
  const finished = minimumElapsed && ready && !active;
  useEffect(() => { const timer = window.setTimeout(() => setMinimumElapsed(true), 400); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    if (!finished) return;
    const timer = window.setTimeout(() => setRemoved(true), 300);
    return () => window.clearTimeout(timer);
  }, [finished]);
  if (removed) return null;
  return <div role="status" aria-live="polite" className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-cream transition-opacity duration-300 motion-reduce:transition-none ${finished ? 'opacity-0' : 'opacity-100'}`}>
    <div className="rounded-full border border-line bg-ivory px-6 py-4 text-sm font-medium text-forest shadow-soft">매장을 준비하고 있어요 · {ready && !active ? 100 : Math.round(progress)}%</div>
  </div>;
}
