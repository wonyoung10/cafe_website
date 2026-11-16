import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import Section from '@/components/common/Section';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('페이지를 찾을 수 없어요');
  return (
    <Section tone="paper" className="flex min-h-[70svh] items-center text-center">
      <svg aria-hidden viewBox="0 0 200 150" fill="none" className="mx-auto mb-8 h-36 w-48">
        <ellipse cx="101" cy="131" rx="53" ry="5" fill="var(--color-cream-deep)" />
        <path d="M51 111C35 62 84 25 153 29c-2 51-25 89-71 89-12 0-22-3-31-7Z" fill="var(--color-sage-soft)" />
        <path d="M39 128c24-29 57-56 96-81M75 93l-4-31M96 77l29 2" stroke="var(--color-forest)" strokeWidth="2" strokeLinecap="round" />
        <path d="m49 39 5 9m-17 7 10 2m111 39-7 5" stroke="var(--color-sage)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h1 className="text-h1 text-forest">길을 잃은 잎사귀예요</h1>
      <p className="mx-auto mt-5 max-w-sm text-ink-soft">요청하신 페이지를 찾을 수 없어요.<br />잠시 쉬어 가며, 새로운 길을 골라보세요.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><ButtonLink to={ROUTES.home}>홈으로</ButtonLink><ButtonLink to={ROUTES.menu} variant="secondary">메뉴 보기</ButtonLink></div>
    </Section>
  );
}
