export const REVIEW_TEXT_MAX = 500;

/** 저장할 때와 같은 방식으로 센다: 앞뒤 공백을 빼고, 이모지도 한 글자 */
export function reviewTextLength(text: string): number {
  return [...text.trim()].length;
}

export function validateReviewText(text: string): string | null {
  const length = reviewTextLength(text);
  if (length === 0) return '리뷰를 한 글자 이상 적어 주세요.';
  if (length > REVIEW_TEXT_MAX) return `${REVIEW_TEXT_MAX}자까지 쓸 수 있어요. ${length - REVIEW_TEXT_MAX}자를 줄여 주세요.`;
  return null;
}

export function validateRating(rating: number): string | null {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? null : '별점을 골라 주세요.';
}
