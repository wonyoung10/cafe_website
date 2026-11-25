import StarRating from '@/components/reviews/StarRating';
import { averageRating, menuName, type ReviewQuery } from '@/components/reviews/reviewQuery';
import type { ReviewView } from '@/types/commerce';

function scopeLabel({ menuId, mine }: ReviewQuery) {
  if (mine) return menuId ? `내가 쓴 ${menuName(menuId)} 리뷰` : '내가 쓴 리뷰';
  return menuId ? `${menuName(menuId)} 리뷰` : '모든 리뷰';
}

/** 지금 보고 있는 조건의 평균 별점과 개수 */
export default function ReviewSummary({ query, reviews }: { query: ReviewQuery; reviews: readonly ReviewView[] }) {
  const average = averageRating(reviews);
  return (
    <div role="status" aria-atomic="true" className="flex flex-wrap items-end gap-x-5 gap-y-2">
      <p className="order-2 pb-1 text-sm text-ink-soft lg:basis-full lg:pb-0">
        <span className="block font-semibold text-walnut">{scopeLabel(query)}</span>
        리뷰 {reviews.length}개{average !== null && '의 평균'}
      </p>
      {average !== null && (
        <p className="order-1 flex items-end gap-3">
          <span className="font-serif text-5xl leading-none font-bold text-forest tabular-nums">{average.toFixed(1)}</span>
          <StarRating value={Math.round(average * 10) / 10} className="mb-1 text-lg" />
        </p>
      )}
    </div>
  );
}
