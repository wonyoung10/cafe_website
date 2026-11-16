import SmartImage from '@/components/common/SmartImage';
import { HOTSPOTS } from '@/data/hotspots';

export default function WebGLFallback() {
  return (
    <div className="rounded-[1.75rem] bg-cream p-5 md:p-8">
      <SmartImage src="/images/store/store-fallback.webp" alt="햇살과 식물이 머무는 하루의 잎 가상 매장" wrapperClassName="aspect-[16/7] rounded-2xl" />
      <p role="status" className="my-6 font-medium text-forest">이 환경에서는 3D 매장을 표시할 수 없어요.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOTSPOTS.map((spot) => <article key={spot.id} className="rounded-2xl border border-line bg-ivory p-5"><h2 className="font-serif text-lg font-bold text-forest">{spot.title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">{spot.description}</p></article>)}
      </div>
    </div>
  );
}
