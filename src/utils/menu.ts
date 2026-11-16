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

/** 카테고리의 메뉴를 대표 메뉴(lead)가 맨 앞에 오도록 정렬해 반환한다. 나머지는 데이터 순서 유지. */
export function getCategoryItems(items: readonly MenuItem[], category: MenuCategory): MenuItem[] {
  const inCategory = items.filter((item) => item.category === category);
  const lead = inCategory.find((item) => item.lead);
  return lead ? [lead, ...inCategory.filter((item) => item !== lead)] : inCategory;
}

/**
 * 데스크톱 3열 격자에서 대표 카드가 차지할 모양.
 * 나머지 카드 수에 맞춰 마지막 줄이 비지 않도록 고른다.
 *  - wide: 2칸 × 1줄 (가로형) · tall: 2칸 × 2줄 (세로형) · full: 3칸 × 1줄 (가로형)
 */
export type LeadLayout = 'wide' | 'tall' | 'full';

const LEAD_SLOTS: ReadonlyArray<readonly [LeadLayout, number]> = [
  ['wide', 2],
  ['tall', 4],
  ['full', 3],
];

export function getLeadLayout(restCount: number, columns = 3): LeadLayout {
  const match = LEAD_SLOTS.find(([, slots]) => (slots + restCount) % columns === 0);
  return match?.[0] ?? 'full';
}
