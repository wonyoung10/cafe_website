import { ButtonLink } from '@/components/common/Button';
import Container from '@/components/common/Container';
import SectionHeading from '@/components/common/SectionHeading';
import StoreExperience from '@/components/three/StoreExperience';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function StorePage() {
  useDocumentTitle('매장');
  return (
    <Container as="section" className="py-8 md:py-10">
      <SectionHeading level={1} title="매장" eyebrow="Virtual Store" description="햇살이 머무는 공간을 먼저 걸어보세요. 실제 매장 도면이 확정되기 전, 브랜드 콘셉트로 구성한 가상 공간이에요." className="mb-7" />
      <StoreExperience />
      <div className="flex justify-center pt-7"><ButtonLink to="/location" variant="secondary" withArrow>오시는 길 보기</ButtonLink></div>
    </Container>
  );
}
