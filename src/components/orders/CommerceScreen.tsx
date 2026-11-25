import type { ReactNode } from 'react';
import Section from '@/components/common/Section';
import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import { useCommerce } from '@/contexts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function CommerceScreen({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle(title);
  const { configured } = useCommerce();
  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-h1 text-forest">{title}</h1>
        {configured ? children : <NotConfiguredNotice />}
      </div>
    </Section>
  );
}
