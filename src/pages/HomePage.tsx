import { BRAND } from '@/data/brand';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function HomePage() {
  useDocumentTitle();
  return (
    <section>
      <h1>{BRAND.tagline}</h1>
      <p>{BRAND.subTagline}</p>
    </section>
  );
}
