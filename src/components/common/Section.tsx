import type { ComponentPropsWithoutRef } from 'react';
import Container from '@/components/common/Container';
import { cn } from '@/utils/cn';

interface SectionProps extends ComponentPropsWithoutRef<'section'> {
  tone?: 'ivory' | 'cream' | 'paper' | 'forest';
  containerClassName?: string;
}

const TONE_CLASS: Record<NonNullable<SectionProps['tone']>, string> = {
  ivory: 'bg-ivory',
  cream: 'bg-cream',
  paper: 'bg-paper',
  forest: 'bg-forest text-ivory',
};

/** 페이지 섹션 래퍼: 일관된 세로 여백 + 컨테이너 */
export default function Section({ tone = 'ivory', className, containerClassName, children, ...rest }: SectionProps) {
  return (
    <section className={cn('py-20 md:py-28', TONE_CLASS[tone], className)} {...rest}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
