import type { MenuCategory, MenuFilter, MenuItem } from '@/types/menu';

const VALID_FILTERS: readonly MenuFilter[] = ['all', 'coffee', 'non-coffee', 'tea', 'dessert'];

export function isMenuFilter(value: unknown): value is MenuFilter {
  return typeof value === 'string' && (VALID_FILTERS as readonly string[]).includes(value);
}

/** URL 쿼리 값을 안전한 필터 값으로 변환한다. 알 수 없는 값은 'all'. */
export function parseMenuFilter(value: string | null | undefined): MenuFilter {
  return isMenuFilter(value) ? value : 'all';
}

export function filterMenuItems(items: readonly MenuItem[], filter: MenuFilter): MenuItem[] {
  if (filter === 'all') return [...items];
  return items.filter((item) => item.category === filter);
}

export function countByCategory(items: readonly MenuItem[]): Record<MenuFilter, number> {
  const counts: Record<MenuFilter, number> = { all: items.length, coffee: 0, 'non-coffee': 0, tea: 0, dessert: 0 };
  for (const item of items) counts[item.category] += 1;
  return counts;
}

export function getFeaturedItems(items: readonly MenuItem[]): MenuItem[] {
  return items.filter((item) => item.featured);
}

export const CATEGORY_LABEL_KO: Record<MenuCategory, string> = {
  coffee: '커피',
  'non-coffee': '논커피',
  tea: '티',
  dessert: '디저트',
};
