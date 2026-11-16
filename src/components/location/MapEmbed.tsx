import { CAFE_LOCATION } from '@/data/cafe';

export default function MapEmbed() {
  return <iframe title="하루의 잎 위치 지도" src={CAFE_LOCATION.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="aspect-[4/3] w-full rounded-leaf-lg border border-line bg-cream" />;
}
