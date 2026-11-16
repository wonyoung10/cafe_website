import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import MenuFilter from '@/components/menu/MenuFilter';
import MenuGrid from '@/components/menu/MenuGrid';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MenuFilter as Filter } from '@/types/menu';
import { countByCategory, filterMenuItems, parseMenuFilter } from '@/utils/menu';

const counts = countByCategory(MENU_ITEMS);

export default function MenuPage() {
  useDocumentTitle('메뉴소개');
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = parseMenuFilter(searchParams.get('category'));
  const items = useMemo(() => filterMenuItems(MENU_ITEMS, selected), [selected]);
  const description = MENU_CATEGORIES.find(({ id }) => id === selected)?.description;

  const changeFilter = (filter: Filter) => {
    if (filter === selected) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (filter === 'all') next.delete('category');
      else next.set('category', filter);
      return next;
    }, { preventScrollReset: true });
  };

  return (
    <Section tone="paper" className="min-h-[70svh]">
      <SectionHeading level={1} title="메뉴소개" description="오늘의 잎 한 장을 고르세요." />
      <div className="mt-10 min-w-0 md:mt-12">
        <MenuFilter selected={selected} counts={counts} onChange={changeFilter} />
      </div>
      <div className="mt-5 mb-6 flex min-h-7 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-ink-soft">{description}</p>
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-ink-soft">{items.length}개의 메뉴</p>
      </div>
      <MenuGrid items={items} />
    </Section>
  );
}
