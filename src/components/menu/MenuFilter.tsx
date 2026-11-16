import { MENU_CATEGORIES } from '@/data/menu';
import type { MenuFilter as Filter } from '@/types/menu';
import { cn } from '@/utils/cn';

interface MenuFilterProps {
  selected: Filter;
  counts: Record<Filter, number>;
  onChange: (filter: Filter) => void;
}

const filters = [{ id: 'all', label: '전체' }, ...MENU_CATEGORIES] as const;

export default function MenuFilter({ selected, counts, onChange }: MenuFilterProps) {
  return (
    <div role="group" aria-label="메뉴 카테고리" className="flex max-w-full gap-2 overflow-x-auto py-2 pr-1 pl-1">
      {filters.map(({ id, label }) => (
        <button key={id} type="button" aria-label={`${label} ${counts[id]}`} aria-pressed={selected === id} onClick={() => onChange(id)} className={cn('flex min-h-11 shrink-0 items-center gap-2 rounded-leaf-sm border px-4 text-sm font-medium transition-colors', selected === id ? 'border-forest bg-forest text-ivory' : 'border-line bg-ivory text-ink-soft hover:border-forest/40 hover:bg-cream')}>
          {label}<span className="text-xs tabular-nums">{counts[id]}</span>
        </button>
      ))}
    </div>
  );
}
