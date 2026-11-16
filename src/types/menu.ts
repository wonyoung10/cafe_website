export type MenuCategory = 'coffee' | 'non-coffee' | 'tea' | 'dessert';

export type Temperature = 'hot' | 'ice';

export type MenuFilter = MenuCategory | 'all';

export interface MenuItem {
  /** kebab-case 식별자. 이미지 파일명(`/images/menu/{id}.webp`)과 동일하다. */
  id: string;
  name: string;
  nameEn: string;
  category: MenuCategory;
  description: string;
  /** 제공 온도. 디저트는 빈 배열. */
  temperatures: readonly Temperature[];
  image: string;
  /** 홈 대표 메뉴 노출 여부 (정확히 4개) */
  featured?: boolean;
}

export interface MenuCategoryInfo {
  id: MenuCategory;
  label: string;
  description: string;
}
