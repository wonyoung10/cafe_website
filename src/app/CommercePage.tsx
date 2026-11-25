import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import Section from '@/components/common/Section';
import { useCommerce } from '@/contexts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function CommercePage({ title }: { title: string }) {
  const { configured } = useCommerce();
  useDocumentTitle(title);
  return (
    <Section>
      <h1 className="font-serif text-h1 text-forest">{title}</h1>
      {!configured && <NotConfiguredNotice />}
    </Section>
  );
}
