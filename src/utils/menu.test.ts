import { describe, expect, it } from 'vitest';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { countByCategory, filterMenuItems, getFeaturedItems, parseMenuFilter } from '@/utils/menu';

describe('menu data', () => {
  it('과제 요구사항의 23개 메뉴를 모두 포함한다', () => {
    expect(MENU_ITEMS).toHaveLength(23);
  });

  it('카테고리별 개수가 Coffee 8 · Non-Coffee 6 · Tea 4 · Dessert 5 이다', () => {
    expect(countByCategory(MENU_ITEMS)).toEqual({ all: 23, coffee: 8, 'non-coffee': 6, tea: 4, dessert: 5 });
  });

  it('id가 고유하고 이미지 경로가 규칙을 따른다', () => {
    const ids = MENU_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of MENU_ITEMS) expect(item.image).toBe(`/images/menu/${item.id}.webp`);
  });

  it('가격 정보를 포함하지 않는다 (과제 범위 제한)', () => {
    for (const item of MENU_ITEMS) expect(item).not.toHaveProperty('price');
  });

  it('디저트는 온도 정보가 없고 음료는 HOT/ICE 중 하나 이상이다', () => {
    for (const item of MENU_ITEMS) {
      if (item.category === 'dessert') expect(item.temperatures).toHaveLength(0);
      else expect(item.temperatures.length).toBeGreaterThan(0);
    }
  });

  it('대표 메뉴는 정확히 4개다', () => {
    expect(getFeaturedItems(MENU_ITEMS)).toHaveLength(4);
  });

  it('카테고리 정보는 4개다', () => {
    expect(MENU_CATEGORIES.map((c) => c.id)).toEqual(['coffee', 'non-coffee', 'tea', 'dessert']);
  });
});

describe('filterMenuItems', () => {
  it.each([
    ['all', 23],
    ['coffee', 8],
    ['non-coffee', 6],
    ['tea', 4],
    ['dessert', 5],
  ] as const)('%s 필터는 %i개를 반환한다', (filter, count) => {
    expect(filterMenuItems(MENU_ITEMS, filter)).toHaveLength(count);
  });
});

describe('parseMenuFilter', () => {
  it('유효한 값은 그대로 반환한다', () => {
    expect(parseMenuFilter('tea')).toBe('tea');
    expect(parseMenuFilter('non-coffee')).toBe('non-coffee');
  });
  it('null이나 알 수 없는 값은 all을 반환한다', () => {
    expect(parseMenuFilter(null)).toBe('all');
    expect(parseMenuFilter('pizza')).toBe('all');
    expect(parseMenuFilter(undefined)).toBe('all');
  });
});
