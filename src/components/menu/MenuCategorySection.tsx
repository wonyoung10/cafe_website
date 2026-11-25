import { motion } from 'motion/react';
import { LeafMark } from '@/components/common/BrandLogo';
import MenuCard from '@/components/menu/MenuCard';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_LEAF } from '@/styles/tokens';
import type { MenuCategoryInfo, MenuItem } from '@/types/menu';
import { cn } from '@/utils/cn';
import { getLeadLayout } from '@/utils/menu';

const LEAD_SPAN = {
  wide: 'sm:col-span-2',
  tall: 'sm:col-span-2 lg:row-span-2',
  full: 'sm:col-span-2 lg:col-span-3',
} as const;

interface MenuCategorySectionProps {
  category: MenuCategoryInfo;
  /** 대표 메뉴가 맨 앞에 정렬된 목록 (getCategoryItems) */
  items: readonly MenuItem[];
}

/**
 * 카테고리 하나를 '읽는 메뉴'로 보여 준다.
 * 왼쪽(데스크톱에서 고정): 카테고리 제목·소개·개수 / 오른쪽: 대표 메뉴 큰 카드 + 나머지 카드 격자
 */
export default function MenuCategorySection({ category, items }: MenuCategorySectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [lead, ...rest] = items;
  const headingId = `menu-category-${category.id}`;
  const leadLayout = getLeadLayout(rest.length);

  return (
    <motion.section
      aria-labelledby={headingId}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: EASE_LEAF }}
      className="grid gap-8 border-t border-line pt-10 first:border-t-0 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:pt-14"
    >
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+5.5rem)] lg:self-start">
        <LeafMark className="mb-4 size-7 text-sage" />
        <h2 id={headingId} className="text-h2 text-forest">
          {category.title}
          <span className="ml-2 align-middle font-sans text-sm font-medium text-walnut" lang="en">{category.label}</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{category.description}</p>
        <p className="mt-4 text-xs text-ink-soft tabular-nums">{items.length}가지</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {lead && (
          <MenuCard item={lead} variant="lead" leadLayout={leadLayout} showCategory={false} showAddToCart className={cn(LEAD_SPAN[leadLayout])} />
        )}
        {rest.map((item) => (
          <MenuCard key={item.id} item={item} showCategory={false} showAddToCart />
        ))}
      </div>
    </motion.section>
  );
}
