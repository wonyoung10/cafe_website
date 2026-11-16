interface PageLoaderProps {
  label?: string;
}

export default function PageLoader({ label = '불러오는 중이에요' }: PageLoaderProps) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50svh] items-center justify-center">
      <span>{label}</span>
    </div>
  );
}
