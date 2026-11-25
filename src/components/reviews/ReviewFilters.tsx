import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { SORTS, SORT_LABEL, type ReviewQuery } from '@/components/reviews/reviewQuery';
import { cn } from '@/utils/cn';

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function Select({ label, value, onChange, children }: SelectProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-semibold text-forest">{label}</span>
      <span className="relative mt-1.5 block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full min-w-0 appearance-none truncate rounded-leaf-sm border border-line bg-ivory pr-9 pl-4 text-base text-ink hover:border-forest/40"
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft" />
      </span>
    </label>
  );
}

interface ReviewFiltersProps {
  query: ReviewQuery;
  onChange: (change: Partial<ReviewQuery>) => void;
}

export default function ReviewFilters({ query, onChange }: ReviewFiltersProps) {
  return (
    <div role="group" aria-label="리뷰 골라 보기" className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end lg:grid-cols-1">
      <Select label="메뉴" value={query.menuId ?? ''} onChange={(value) => onChange({ menuId: value || null })}>
        <option value="">모든 메뉴</option>
        {MENU_CATEGORIES.map(({ id, title }) => (
          <optgroup key={id} label={title}>
            {MENU_ITEMS.filter(({ category }) => category === id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </optgroup>
        ))}
      </Select>
      <Select label="정렬" value={query.sort} onChange={(value) => onChange({ sort: SORTS.find((sort) => sort === value) ?? 'latest' })}>
        {SORTS.map((sort) => <option key={sort} value={sort}>{SORT_LABEL[sort]}</option>)}
      </Select>
      <button
        type="button"
        aria-pressed={query.mine}
        onClick={() => onChange({ mine: !query.mine })}
        className={cn(
          'col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-leaf-sm border px-5 text-sm font-medium transition-colors sm:col-span-1 lg:justify-start lg:px-4',
          query.mine ? 'border-forest bg-forest text-ivory' : 'border-line bg-ivory text-ink-soft hover:border-forest/40 hover:bg-cream',
        )}
      >
        {query.mine && <Check aria-hidden className="size-4" />}
        내 리뷰만
      </button>
    </div>
  );
}
