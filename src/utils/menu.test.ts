import { describe, expect, it } from 'vitest';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/menu';
import { countByCategory, filterMenuItems, getCategoryItems, getFeaturedItems, getLeadLayout, parseMenuFilter } from '@/utils/menu';

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

describe('getCategoryItems', () => {
  it('카테고리마다 대표 메뉴(lead)가 정확히 하나씩 있다', () => {
    for (const { id } of MENU_CATEGORIES) {
      expect(MENU_ITEMS.filter((item) => item.category === id && item.lead)).toHaveLength(1);
    }
  });

  it('대표 메뉴를 맨 앞에 두고 나머지는 데이터 순서를 유지한다', () => {
    const coffee = getCategoryItems(MENU_ITEMS, 'coffee');
    expect(coffee).toHaveLength(8);
    expect(coffee[0]?.id).toBe('cafe-latte');
    expect(coffee.slice(1).map((item) => item.id)).toEqual(
      MENU_ITEMS.filter((item) => item.category === 'coffee' && !item.lead).map((item) => item.id),
    );
  });
});

describe('getLeadLayout', () => {
  const slots = { wide: 2, tall: 4, full: 3 } as const;
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])('나머지 %i개일 때 3열 격자의 마지막 줄이 꽉 찬다', (rest) => {
    expect((slots[getLeadLayout(rest)] + rest) % 3).toBe(0);
  });

  it('현재 메뉴 데이터에서 커피·디저트는 wide, 논커피는 tall, 차는 full이다', () => {
    const layout = (id: 'coffee' | 'non-coffee' | 'tea' | 'dessert') => getLeadLayout(getCategoryItems(MENU_ITEMS, id).length - 1);
    expect([layout('coffee'), layout('non-coffee'), layout('tea'), layout('dessert')]).toEqual(['wide', 'tall', 'full', 'wide']);
  });
});
