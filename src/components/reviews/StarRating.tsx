import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

const FIVE = [1, 2, 3, 4, 5] as const;

function Row({ className }: { className: string }) {
  return (
    <span className={cn('flex w-max gap-0.5', className)}>
      {FIVE.map((value) => <Star key={value} className="size-[1em] shrink-0" strokeWidth={1.5} />)}
    </span>
  );
}

interface StarRatingProps {
  /** 평균처럼 소수일 수 있다 */
  value: number;
  className?: string;
}

/** 별 다섯 개에 점수만큼 색을 채운다. 글로는 "별점 5점 만점에 4점"으로 읽힌다. */
export default function StarRating({ value, className }: StarRatingProps) {
  const label = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <span role="img" aria-label={`별점 5점 만점에 ${label}점`} className={cn('relative inline-block align-middle leading-none', className)}>
      <Row className="text-walnut/55" />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(value / 5) * 100}%` }}>
        <Row className="text-walnut [&>svg]:fill-current" />
      </span>
    </span>
  );
}
