import { BRAND } from '@/data/brand';
import { cn } from '@/utils/cn';

interface LeafMarkProps {
  className?: string;
  title?: string;
}

/** 브랜드 심볼: 줄기 하나와 비대칭 잎 한 장 */
export function LeafMark({ className, title }: LeafMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <path d="M16 28c0-8 1-14.5 9-21.5C17.5 7.6 11 12.6 11 20c0 4 2 6.9 5 8z" fill="currentColor" />
      <path d="M16 28c-.6-5 .6-10 5.3-15" stroke="var(--color-sage)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface BrandLogoProps {
  className?: string;
  /** 'light'는 어두운 배경(푸터)용 */
  tone?: 'default' | 'light';
  showSubtitle?: boolean;
}

export default function BrandLogo({ className, tone = 'default', showSubtitle = false }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'grid size-9 place-items-center rounded-leaf-sm',
          tone === 'light' ? 'bg-ivory/10 text-sage' : 'bg-sage-soft text-forest',
        )}
      >
        <LeafMark className="size-6" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-serif text-[1.3rem] font-bold tracking-[-0.02em]',
            tone === 'light' ? 'text-ivory' : 'text-forest',
          )}
        >
          {BRAND.name}
        </span>
        {showSubtitle && (
          <span
            className={cn(
              'mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.2em]',
              tone === 'light' ? 'text-ivory/60' : 'text-walnut',
            )}
          >
            Coffee &amp; Rest
          </span>
        )}
      </span>
    </span>
  );
}
