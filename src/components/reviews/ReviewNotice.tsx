import type { ReactNode } from 'react';
import { LeafMark } from '@/components/common/BrandLogo';
import { cn } from '@/utils/cn';

interface ReviewNoticeProps {
  title: string;
  children?: ReactNode;
  /** 버튼이나 링크 */
  action?: ReactNode;
  role?: 'alert' | 'status';
  className?: string;
}

/** 빈 목록, 오류, 들어올 수 없는 화면을 같은 모양으로 알린다 */
export default function ReviewNotice({ title, children, action, role, className }: ReviewNoticeProps) {
  return (
    <div role={role} className={cn('max-w-md py-4', className)}>
      <LeafMark className="-ml-2 size-8 text-sage" />
      <p className="mt-4 font-serif text-xl font-bold text-forest">{title}</p>
      {children && <p className="mt-2 text-ink-soft">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
