import type { Point3, TimeOfDay } from '@/types/three';

/**
 * '하루의 빛' — 시간대별 조명 프리셋 (docs/07-threejs-planning.md §4.1)
 * 순수 데이터와 함수만 두어 Vitest로 검증한다. three.js를 import하지 않는다.
 */
export interface DaylightPreset {
  id: TimeOfDay;
  label: string;
  /** 뷰어에 보이는 한 줄 설명 */
  caption: string;
  sun: { position: Point3; color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  pendant: { intensity: number; distance: number };
  /** 펜던트 전구 메시의 발광 세기 */
  bulbGlow: number;
  /** 창밖 정원 배경에 곱해지는 색 (저녁엔 어두운 남색) */
  outsideTint: string;
  /** 창유리의 발광 세기 */
  glassGlow: number;
  ceilingGlow: number;
  background: string;
  exposure: number;
}

export const TIME_OF_DAY_ORDER: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening'];

export const DAYLIGHT_PRESETS: Record<TimeOfDay, DaylightPreset> = {
  morning: {
    id: 'morning',
    label: '아침',
    caption: '낮게 든 아침 햇살이 바닥에 길게 눕는 시간',
    // 낮은 고도의 햇빛 → 실내 깊숙이 긴 그림자
    sun: { position: [-7, 3.2, 9], color: '#FFF3E2', intensity: 2.1 },
    hemisphere: { sky: '#F3F5F1', ground: '#A88B6E', intensity: 0.62 },
    pendant: { intensity: 0.15, distance: 4 },
    bulbGlow: 0.5,
    outsideTint: '#FFFFFF',
    glassGlow: 0.2,
    ceilingGlow: 0.42,
    background: '#F3EBDD',
    exposure: 1.05,
  },
  afternoon: {
    id: 'afternoon',
    label: '오후',
    caption: '금빛으로 데워진 오후, 그림자가 짧아지는 시간',
    sun: { position: [3, 6.5, 9], color: '#FFD9A3', intensity: 2.5 },
    hemisphere: { sky: '#FFF1DC', ground: '#A88B6E', intensity: 0.6 },
    pendant: { intensity: 0.5, distance: 4 },
    bulbGlow: 1.0,
    outsideTint: '#FFF0D6',
    glassGlow: 0.15,
    ceilingGlow: 0.4,
    background: '#F3EBDD',
    exposure: 1.0,
  },
  evening: {
    id: 'evening',
    label: '저녁',
    caption: '창밖이 저물고 펜던트 불빛이 공간을 감싸는 시간',
    sun: { position: [6, 4, 9], color: '#8E9CC4', intensity: 0.12 },
    hemisphere: { sky: '#46506B', ground: '#3B2C22', intensity: 0.32 },
    pendant: { intensity: 3.2, distance: 6.5 },
    bulbGlow: 3.2,
    outsideTint: '#2F3A55',
    glassGlow: 0.02,
    ceilingGlow: 0.06,
    background: '#2A2F3A',
    exposure: 1.1,
  },
};

/**
 * 현재 시각으로 기본 시간대를 정한다.
 * 05:00–10:59 아침 · 11:00–16:59 오후 · 그 외 저녁
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  return 'evening';
}

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && (TIME_OF_DAY_ORDER as readonly string[]).includes(value);
}
