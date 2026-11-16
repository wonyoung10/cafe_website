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
  /** 메뉴소개 페이지에서 카테고리를 여는 대표 메뉴 (카테고리마다 정확히 1개) */
  lead?: boolean;
}

export interface MenuCategoryInfo {
  id: MenuCategory;
  label: string;
  /** 섹션 제목에 쓰는 한국어 이름 */
  title: string;
  description: string;
}
