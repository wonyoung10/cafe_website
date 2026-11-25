import { memo } from 'react';
import AddToCart from '@/components/cart/AddToCart';
import { useCommerce } from '@/contexts';
import SmartImage from '@/components/common/SmartImage';
import TemperatureBadges from '@/components/menu/TemperatureBadges';
import { MENU_CATEGORIES } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { cn } from '@/utils/cn';
import { formatPrice, type LeadLayout } from '@/utils/menu';

interface MenuCardProps {
  item: MenuItem;
  /** 'lead'는 메뉴소개 페이지에서 카테고리를 여는 큰 가로형 카드 */
  variant?: 'default' | 'lead';
  /** 카테고리 섹션 안에서는 카테고리명이 이미 제목에 있으므로 숨긴다 */
  showCategory?: boolean;
  /** lead 카드의 데스크톱 격자 모양 (getLeadLayout) */
  leadLayout?: LeadLayout;
  showAddToCart?: boolean;
  className?: string;
}

const LEAD_LAYOUT: Record<LeadLayout, { card: string; image: string }> = {
  // 2칸 × 1줄: 일반 카드 한 장 높이에 맞춘 가로형
  wide: { card: 'md:grid-cols-2', image: 'aspect-[4/3] md:aspect-auto md:h-full md:min-h-72' },
  // 2칸 × 2줄: 데스크톱에서 사진이 큰 세로형
  tall: { card: 'md:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[auto_1fr]', image: 'aspect-[4/3] md:aspect-auto md:h-full md:min-h-72 lg:aspect-[4/5] lg:h-auto' },
  // 3칸 × 1줄: 넓은 가로형
  full: { card: 'md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]', image: 'aspect-[4/3] md:aspect-auto md:h-full md:min-h-80' },
};

/** 온도 배지(왼쪽)와 가격(오른쪽)을 한 줄에 둔다. 디저트는 가격만. */
function PriceRow({ item, temperatures, large = false }: { item: MenuItem; temperatures: MenuItem['temperatures']; large?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', large ? 'mt-6' : 'mt-4')}>
      <TemperatureBadges temperatures={temperatures} className="" />
      <p className={cn('ml-auto font-semibold text-forest tabular-nums', large ? 'font-serif text-xl' : 'text-base')}>
        <data value={item.price}>{formatPrice(item.price)}</data>
      </p>
    </div>
  );
}

function MenuCard({ item, variant = 'default', showCategory = true, leadLayout = 'full', showAddToCart = false, className }: MenuCardProps) {
  const { configured } = useCommerce();
  const canAdd = showAddToCart && configured;
  const category = MENU_CATEGORIES.find(({ id }) => id === item.category);
  const temperatures = item.category === 'dessert' || (canAdd && item.temperatures.length > 1) ? [] : item.temperatures;

  if (variant === 'lead') {
    return (
      <article className={cn('group grid h-full min-w-0 overflow-hidden rounded-leaf border border-line bg-ivory shadow-soft transition-shadow duration-400 hover:shadow-lift', LEAD_LAYOUT[leadLayout].card, className)}>
        <SmartImage
          src={item.image}
          alt={`${item.name} 사진`}
          wrapperClassName={LEAD_LAYOUT[leadLayout].image}
          className="transition-[opacity,transform] duration-700 ease-[var(--ease-leaf)] motion-safe:group-hover:scale-[1.03]"
        />
        <div className={cn('flex min-w-0 flex-col justify-center px-6 py-7', leadLayout === 'full' ? 'md:px-10 md:py-10' : 'md:px-8 md:py-8')}>
          {showCategory && <p className="text-xs font-semibold text-walnut" lang="en">{category?.label}</p>}
          <h3 className="font-serif text-2xl leading-snug font-bold text-forest md:text-[1.75rem]">{item.name}</h3>
          <p className="mt-1 text-sm text-ink-soft" lang="en">{item.nameEn}</p>
          <p className="mt-5 max-w-sm leading-relaxed text-ink-soft">{item.description}</p>
          <PriceRow item={item} temperatures={temperatures} large />
          {canAdd && <AddToCart item={item} />}
        </div>
      </article>
    );
  }

  return (
    <article className={cn('group h-full min-w-0 rounded-leaf border border-line bg-ivory p-3 shadow-soft transition-shadow duration-400 hover:shadow-lift', className)}>
      <SmartImage
        src={item.image}
        alt={`${item.name} 사진`}
        wrapperClassName="aspect-square rounded-leaf-sm"
        className="transition-[opacity,transform] duration-400 ease-[var(--ease-leaf)] motion-safe:group-hover:scale-[1.03]"
      />
      <div className={cn('px-2 pb-3', showCategory ? 'pt-5' : 'pt-4')}>
        {showCategory && <p className="mb-1.5 text-xs font-semibold text-walnut" lang="en">{category?.label}</p>}
        <h3 className="text-lg leading-snug font-semibold text-forest">{item.name}</h3>
        <p className="mt-0.5 text-xs text-ink-soft" lang="en">{item.nameEn}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{item.description}</p>
        <PriceRow item={item} temperatures={temperatures} />
        {canAdd && <AddToCart item={item} />}
      </div>
    </article>
  );
}

export default memo(MenuCard);
