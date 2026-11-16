import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** 페이지 최상단 제목이면 h1 */
  level?: 1 | 2;
  align?: 'left' | 'center';
  id?: string;
  className?: string;
  tone?: 'default' | 'light';
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  level = 2,
  align = 'left',
  id,
  className,
  tone = 'default',
}: SectionHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className={cn('text-eyebrow mb-3', tone === 'light' && 'text-sage')} aria-hidden={false}>
          {eyebrow}
        </p>
      )}
      <Heading id={id} className={cn(level === 1 ? 'text-h1' : 'text-h2', tone === 'light' ? 'text-ivory' : 'text-forest')}>
        {title}
      </Heading>
      {description && (
        <p className={cn('mt-4', tone === 'light' ? 'text-ivory/80' : 'text-ink-soft')}>{description}</p>
      )}
    </div>
  );
}
