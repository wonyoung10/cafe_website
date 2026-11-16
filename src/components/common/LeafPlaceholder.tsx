import { LeafMark } from '@/components/common/BrandLogo';
import { cn } from '@/utils/cn';

interface LeafPlaceholderProps {
  className?: string;
  label?: string;
}

/** 이미지가 없거나 로드에 실패했을 때 보여주는 잎사귀 플레이스홀더 */
export default function LeafPlaceholder({ className, label }: LeafPlaceholderProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="leaf-placeholder"
      className={cn('bg-paper grid size-full place-items-center text-sage', className)}
    >
      <LeafMark className="size-1/4 max-h-20 max-w-20 opacity-80" />
    </div>
  );
}
