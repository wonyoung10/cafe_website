import { ExternalButtonLink } from '@/components/common/Button';
import { CAFE_LOCATION } from '@/data/cafe';

export default function DirectionsLinks() {
  return (
    <div className="flex flex-col items-start gap-3">
      <ExternalButtonLink href={CAFE_LOCATION.naverMapUrl} className="w-full">네이버지도에서 길찾기</ExternalButtonLink>
      <ExternalButtonLink href={CAFE_LOCATION.kakaoMapUrl} variant="secondary" className="w-full">카카오맵에서 길찾기</ExternalButtonLink>
      <a href={CAFE_LOCATION.mapViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-forest">OpenStreetMap에서 크게 보기<span className="sr-only"> (새 창)</span></a>
    </div>
  );
}
