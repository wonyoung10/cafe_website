import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useInView } from '@/hooks/useInView';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_LEAF } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { WEEKDAYS, describeTodayLeaf, weekdayIndex } from '@/utils/today';

/* 가지(줄기) 곡선: 왼쪽 아래에서 오른쪽 위로 완만하게 자란다 */
const P0 = { x: 16, y: 126 };
const P1 = { x: 220, y: 156 };
const P2 = { x: 430, y: 52 };
const P3 = { x: 704, y: 78 };
const STEM = `M${P0.x} ${P0.y} C${P1.x} ${P1.y} ${P2.x} ${P2.y} ${P3.x} ${P3.y}`;

function pointAt(t: number) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * P0.x + b * P1.x + c * P2.x + d * P3.x,
    y: a * P0.y + b * P1.y + c * P2.y + d * P3.y,
  };
}

/* 잎 한 장: (0,0)이 잎자루, 위로 자라는 비대칭 잎 */
const LEAF = 'M0 0C-15 -10 -17 -34 -2 -52C13 -38 15 -14 0 0Z';
const VEIN = 'M0 -2C-1 -16 -2 -30 -2 -46';

type LeafState = 'past' | 'today' | 'future';

const LEAF_STYLE: Record<LeafState, { fill: string; stroke: string; vein: string }> = {
  past: { fill: 'var(--color-sage)', stroke: 'var(--color-sage)', vein: 'var(--color-sage-soft)' },
  today: { fill: 'var(--color-forest)', stroke: 'var(--color-forest)', vein: 'var(--color-sage)' },
  future: { fill: 'var(--color-ivory)', stroke: 'var(--color-sage)', vein: 'var(--color-sage-soft)' },
};

interface WeekBranchProps {
  /** 테스트용 고정 날짜. 생략하면 오늘 */
  date?: Date;
  className?: string;
}

/**
 * '하루에 잎 하나'를 이번 주 7일의 가지로 보여 준다.
 * 지난 요일은 세이지, 오늘은 포레스트, 남은 요일은 아직 돋지 않은 잎.
 */
export default function WeekBranch({ date, className }: WeekBranchProps) {
  const today = useMemo(() => date ?? new Date(), [date]);
  const todayIndex = weekdayIndex(today);
  const { ref, inView } = useInView<HTMLDivElement>('0px 0px -15% 0px');
  const reducedMotion = usePrefersReducedMotion();
  const grown = reducedMotion || inView;

  const leaves = WEEKDAYS.map((day, index) => {
    const t = 0.07 + index * 0.143;
    const point = pointAt(t);
    const state: LeafState = index < todayIndex ? 'past' : index === todayIndex ? 'today' : 'future';
    return { day, index, point, rotate: index % 2 === 0 ? -26 : 22, state };
  });

  return (
    <figure ref={ref} className={cn('min-w-0', className)}>
      <svg
        viewBox="0 0 720 176"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`월요일부터 일요일까지 일곱 장의 잎이 달린 가지. ${describeTodayLeaf(today)}`}
      >
        <motion.path
          d={STEM}
          fill="none"
          stroke="var(--color-walnut)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: grown ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 1.1, ease: EASE_LEAF }}
        />
        {leaves.map(({ day, index, point, rotate, state }) => {
          const style = LEAF_STYLE[state];
          return (
            <g key={day}>
              <g transform={`translate(${point.x} ${point.y}) rotate(${rotate})`}>
                <motion.g
                  initial={false}
                  animate={{ scale: grown ? 1 : 0 }}
                  style={{ transformBox: 'view-box', originX: '0px', originY: '0px' }}
                  transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.5 + index * 0.12, ease: EASE_LEAF }}
                >
                  <path
                    d={LEAF}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={1.5}
                    strokeDasharray={state === 'future' ? '3 4' : undefined}
                  />
                  <path d={VEIN} fill="none" stroke={style.vein} strokeWidth={1.2} strokeLinecap="round" />
                </motion.g>
              </g>
              <text
                x={point.x}
                y={point.y + 38}
                textAnchor="middle"
                className={cn('font-sans text-[26px] sm:text-[19px] lg:text-[15px]', state === 'today' ? 'font-bold' : 'font-medium')}
                fill={state === 'future' ? 'var(--color-ink-soft)' : state === 'today' ? 'var(--color-forest)' : 'var(--color-walnut)'}
              >
                {day}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-5 font-serif text-lg text-forest md:text-xl">{describeTodayLeaf(today)}</figcaption>
    </figure>
  );
}
