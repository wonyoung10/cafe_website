import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'hot' | 'ice' | 'neutral' | 'forest';

const TONE: Record<BadgeTone, string> = {
  hot: 'bg-walnut-soft text-walnut',
  ice: 'bg-sage-soft text-forest',
  neutral: 'bg-cream-deep text-ink-soft',
  forest: 'bg-forest text-ivory',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[0.6875rem] font-bold tracking-[0.08em]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
