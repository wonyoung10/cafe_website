import { MENU_ITEMS } from '@/data/menu';
import type { ReviewSort, ReviewView } from '@/types/commerce';

export interface ReviewQuery {
  menuId: string | null;
  mine: boolean;
  sort: ReviewSort;
}

export const SORT_LABEL: Record<ReviewSort, string> = {
  latest: '최신순',
  'rating-high': '별점 높은순',
  'rating-low': '별점 낮은순',
};
export const SORTS = Object.keys(SORT_LABEL) as ReviewSort[];

export function menuName(menuId: string): string {
  return MENU_ITEMS.find(({ id }) => id === menuId)?.name ?? '지금은 없는 메뉴';
}

/** URL 쿼리를 안전한 조건으로 바꾼다. 모르는 값은 기본값. */
export function parseReviewQuery(params: URLSearchParams): ReviewQuery {
  const menuId = params.get('menu');
  const sort = params.get('sort');
  return {
    menuId: MENU_ITEMS.some(({ id }) => id === menuId) ? menuId : null,
    mine: params.get('mine') === '1',
    sort: SORTS.find((value) => value === sort) ?? 'latest',
  };
}

/** 바뀐 조건을 쿼리에 쓴다. 기본값은 지워 주소를 짧게 두고, 다른 쿼리는 건드리지 않는다. */
export function writeReviewQuery(params: URLSearchParams, change: Partial<ReviewQuery>): URLSearchParams {
  const next = new URLSearchParams(params);
  const { menuId, mine, sort } = { ...parseReviewQuery(params), ...change };
  const put = (key: string, value: string | null) => (value ? next.set(key, value) : next.delete(key));
  put('menu', menuId);
  put('mine', mine ? '1' : null);
  put('sort', sort === 'latest' ? null : sort);
  return next;
}

export function averageRating(reviews: readonly Pick<ReviewView, 'rating'>[]): number | null {
  if (!reviews.length) return null;
  return reviews.reduce((sum, { rating }) => sum + rating, 0) / reviews.length;
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' });

/** "2026년 11월 25일" (가게가 있는 서울 시각 기준) */
export function formatDay(iso: string): string {
  return dateFormat.format(new Date(iso));
}
