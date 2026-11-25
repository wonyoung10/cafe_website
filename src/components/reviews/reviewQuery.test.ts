import { describe, expect, it } from 'vitest';
import { averageRating, formatDay, menuName, parseReviewQuery, writeReviewQuery } from './reviewQuery';
import { reviewTextLength, validateRating, validateReviewText } from './reviewText';

const parse = (search: string) => parseReviewQuery(new URLSearchParams(search));

describe('리뷰 조건과 URL 쿼리 (RV-08)', () => {
  it('menu, mine, sort를 읽고 모르는 값은 기본값으로 둔다', () => {
    expect(parse('menu=cookie&mine=1&sort=rating-low')).toEqual({ menuId: 'cookie', mine: true, sort: 'rating-low' });
    expect(parse('menu=unknown&mine=true&sort=toString')).toEqual({ menuId: null, mine: false, sort: 'latest' });
    expect(parse('')).toEqual({ menuId: null, mine: false, sort: 'latest' });
  });

  it('바뀐 조건만 쓰고 기본값은 지우며 다른 쿼리는 남긴다', () => {
    const start = new URLSearchParams('from=home&menu=cookie&sort=rating-high');
    expect(writeReviewQuery(start, { mine: true }).toString()).toBe('from=home&menu=cookie&sort=rating-high&mine=1');
    expect(writeReviewQuery(start, { menuId: null, sort: 'latest' }).toString()).toBe('from=home');
    expect(start.toString()).toBe('from=home&menu=cookie&sort=rating-high');
  });

  it('평균 별점을 계산하고 리뷰가 없으면 null', () => {
    expect(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toBeCloseTo(13 / 3);
    expect(averageRating([])).toBeNull();
  });

  it('메뉴 이름과 서울 날짜를 글로 바꾼다', () => {
    expect(menuName('cookie')).toBe('쿠키');
    expect(menuName('gone')).toBe('지금은 없는 메뉴');
    expect(formatDay('2026-11-24T15:30:00.000Z')).toBe('2026년 11월 25일');
  });
});

describe('리뷰 입력 규칙 (RV-03, RV-07)', () => {
  it.each([['가', null], ['가'.repeat(500), null], ['  ' + '가'.repeat(500) + '\n', null], ['🍃'.repeat(500), null]])('받는 글 %#', (text, expected) => {
    expect(validateReviewText(text)).toBe(expected);
  });

  it.each(['', '   \n'])('빈 글을 거절한다 %#', (text) => {
    expect(validateReviewText(text)).toBe('리뷰를 한 글자 이상 적어 주세요.');
  });

  it('500자를 넘으면 줄일 글자 수를 알려 준다', () => {
    expect(validateReviewText('가'.repeat(512))).toBe('500자까지 쓸 수 있어요. 12자를 줄여 주세요.');
    expect(reviewTextLength(' 🍃잎 ')).toBe(2);
  });

  it.each([[0, '별점을 골라 주세요.'], [6, '별점을 골라 주세요.'], [1, null], [5, null]])('별점 %i', (rating, expected) => {
    expect(validateRating(rating)).toBe(expected);
  });
});
