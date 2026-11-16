import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import MenuCategorySection from '@/components/menu/MenuCategorySection';
import MenuFilter from '@/components/menu/MenuFilter';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { MenuFilter as Filter } from '@/types/menu';
import { countByCategory, getCategoryItems, parseMenuFilter } from '@/utils/menu';

const counts = countByCategory(MENU_ITEMS);

export default function MenuPage() {
  useDocumentTitle('메뉴소개');
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();
  const listTop = useRef<HTMLDivElement>(null);
  const selected = parseMenuFilter(searchParams.get('category'));

  const sections = useMemo(
    () =>
      MENU_CATEGORIES.filter(({ id }) => selected === 'all' || selected === id).map((category) => ({
        category,
        items: getCategoryItems(MENU_ITEMS, category.id),
      })),
    [selected],
  );
  const total = sections.reduce((sum, { items }) => sum + items.length, 0);

  const changeFilter = (filter: Filter) => {
    if (filter === selected) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (filter === 'all') next.delete('category');
        else next.set('category', filter);
        return next;
      },
      { preventScrollReset: true },
    );
    // 고정된 필터 막대 아래로 목록이 이미 지나갔다면, 새 목록의 처음이 보이도록 올려 준다
    const anchor = listTop.current;
    if (anchor && anchor.getBoundingClientRect().top < 0) {
      anchor.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <Section tone="paper" className="min-h-[70svh]">
      <SectionHeading level={1} title="메뉴소개" description="오늘의 잎 한 장을 고르세요." />

      <div ref={listTop} className="scroll-mt-[calc(var(--header-height)+5rem)]" aria-hidden />
      <div className="sticky top-[var(--header-height)] z-20 -mx-5 mt-8 border-b border-line/70 bg-ivory/90 px-5 backdrop-blur-md md:-mx-8 md:mt-10 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 py-2">
          <MenuFilter selected={selected} counts={counts} onChange={changeFilter} />
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only text-sm text-ink-soft sm:not-sr-only">
            {total}개의 메뉴
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-14 md:mt-14 md:space-y-20">
        <AnimatePresence initial={false} mode="popLayout">
          {sections.map(({ category, items }) => (
            <MenuCategorySection key={category.id} category={category} items={items} />
          ))}
        </AnimatePresence>
      </div>
    </Section>
  );
}
