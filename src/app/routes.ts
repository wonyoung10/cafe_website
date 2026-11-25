export const ROUTES = {
  home: '/',
  menu: '/menu',
  store: '/store',
  location: '/location',
  signup: '/signup',
  login: '/login',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  orderDetail: '/orders/:orderId',
  reviews: '/reviews',
  reviewNew: '/reviews/new',
  reviewEdit: '/reviews/:reviewId/edit',
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export interface NavItem {
  to: AppRoutePath;
  label: string;
}

/** 헤더 내비게이션 항목 (순서 고정: 메뉴소개 · 매장 · 오시는 길 · 리뷰) */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.menu, label: '메뉴소개' },
  { to: ROUTES.store, label: '매장' },
  { to: ROUTES.location, label: '오시는 길' },
  { to: ROUTES.reviews, label: '리뷰' },
];
