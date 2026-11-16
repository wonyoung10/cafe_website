export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const ORDINALS = ['첫', '두', '세', '네', '다섯', '여섯', '일곱'] as const;

/** 월요일을 0으로 하는 요일 순서 (Date#getDay는 일요일이 0) */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** 예: "11월 16일 월요일" */
export function formatToday(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[weekdayIndex(date)]}요일`;
}

/** 예: "오늘은 월요일, 이번 주 첫 번째 잎이에요." */
export function describeTodayLeaf(date: Date): string {
  const index = weekdayIndex(date);
  return `오늘은 ${WEEKDAYS[index]}요일, 이번 주 ${ORDINALS[index]} 번째 잎이에요.`;
}

/** <time datetime>용 로컬 날짜 (YYYY-MM-DD) */
export function toDateAttribute(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
