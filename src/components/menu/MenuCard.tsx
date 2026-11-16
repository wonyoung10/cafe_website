import { memo } from 'react';
import SmartImage from '@/components/common/SmartImage';
import TemperatureBadges from '@/components/menu/TemperatureBadges';
import { MENU_CATEGORIES } from '@/data/menu';
import type { MenuItem } from '@/types/menu';

function MenuCard({ item }: { item: MenuItem }) {
  const category = MENU_CATEGORIES.find(({ id }) => id === item.category);
  return (
    <article className="group h-full min-w-0 rounded-3xl border border-line bg-ivory p-3 shadow-soft transition-shadow duration-400 hover:shadow-lift">
      <SmartImage src={item.image} alt={`${item.name} 사진`} wrapperClassName="aspect-square rounded-[1.25rem]" className="transition-[opacity,transform] duration-400 ease-[var(--ease-leaf)] motion-safe:group-hover:scale-[1.03]" />
      <div className="px-2 pt-5 pb-3">
        <p className="text-eyebrow">{category?.label}</p>
        <h3 className="mt-2 text-lg leading-snug font-semibold text-forest">{item.name}</h3>
        <p className="mt-1 text-xs text-ink-soft" lang="en">{item.nameEn}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{item.description}</p>
        <TemperatureBadges temperatures={item.category === 'dessert' ? [] : item.temperatures} />
      </div>
    </article>
  );
}

export default memo(MenuCard);
