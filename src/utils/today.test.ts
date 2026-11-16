import { describe, expect, it } from 'vitest';
import { describeTodayLeaf, formatToday, weekdayIndex } from '@/utils/today';

describe('today helpers', () => {
  it('월요일을 0, 일요일을 6으로 센다', () => {
    expect(weekdayIndex(new Date(2026, 10, 16))).toBe(0); // 월
    expect(weekdayIndex(new Date(2026, 10, 22))).toBe(6); // 일
  });

  it('오늘 날짜와 이번 주 몇 번째 잎인지 알려 준다', () => {
    expect(formatToday(new Date(2026, 10, 16))).toBe('11월 16일 월요일');
    expect(describeTodayLeaf(new Date(2026, 10, 16))).toBe('오늘은 월요일, 이번 주 첫 번째 잎이에요.');
    expect(describeTodayLeaf(new Date(2026, 10, 20))).toBe('오늘은 금요일, 이번 주 다섯 번째 잎이에요.');
  });
});
