import StoreExperience from '@/components/three/StoreExperience';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function StorePage() {
  useDocumentTitle('매장');
  return (
    <section>
      <h1>매장</h1>
      <StoreExperience />
    </section>
  );
}
