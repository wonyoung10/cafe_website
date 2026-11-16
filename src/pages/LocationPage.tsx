import { CAFE_LOCATION } from '@/data/cafe';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function LocationPage() {
  useDocumentTitle('오시는 길');
  return (
    <section>
      <h1>오시는 길</h1>
      <p>{CAFE_LOCATION.address}</p>
    </section>
  );
}
