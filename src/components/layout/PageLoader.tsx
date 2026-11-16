import { LeafMark } from '@/components/common/BrandLogo';

interface PageLoaderProps {
  label?: string;
}

export default function PageLoader({ label = '불러오는 중이에요' }: PageLoaderProps) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60svh] flex-col items-center justify-center gap-4 text-forest">
      <LeafMark className="size-10 animate-pulse" />
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}
