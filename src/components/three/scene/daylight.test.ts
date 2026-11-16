import { describe, expect, it } from 'vitest';
import { DAYLIGHT_PRESETS, getTimeOfDay, isTimeOfDay, TIME_OF_DAY_ORDER } from './daylight';

const at = (hour: number, minute = 0) => new Date(2026, 10, 16, hour, minute);

describe('getTimeOfDay', () => {
  it.each([
    [5, 0, 'morning'],
    [10, 59, 'morning'],
    [11, 0, 'afternoon'],
    [16, 59, 'afternoon'],
    [17, 0, 'evening'],
    [23, 30, 'evening'],
    [0, 0, 'evening'],
    [4, 59, 'evening'],
  ] as const)('%i:%i 는 %s', (hour, minute, expected) => {
    expect(getTimeOfDay(at(hour, minute))).toBe(expected);
  });
});

describe('DAYLIGHT_PRESETS', () => {
  it('아침 · 오후 · 저녁 세 가지 프리셋을 순서대로 가진다', () => {
    expect(TIME_OF_DAY_ORDER).toEqual(['morning', 'afternoon', 'evening']);
    for (const id of TIME_OF_DAY_ORDER) expect(DAYLIGHT_PRESETS[id].id).toBe(id);
    expect(TIME_OF_DAY_ORDER.map((id) => DAYLIGHT_PRESETS[id].label)).toEqual(['아침', '오후', '저녁']);
  });

  it('저녁에는 햇빛이 거의 꺼지고 펜던트 조명이 가장 밝다', () => {
    const { morning, afternoon, evening } = DAYLIGHT_PRESETS;
    expect(evening.sun.intensity).toBeLessThan(morning.sun.intensity * 0.2);
    expect(evening.pendant.intensity).toBeGreaterThan(afternoon.pendant.intensity);
    expect(afternoon.pendant.intensity).toBeGreaterThan(morning.pendant.intensity);
  });

  it('아침 햇빛은 오후보다 고도가 낮아 그림자가 길다', () => {
    const elevation = ([x, y, z]: readonly number[]) => Math.atan2(y ?? 0, Math.hypot(x ?? 0, z ?? 0));
    expect(elevation(DAYLIGHT_PRESETS.morning.sun.position)).toBeLessThan(elevation(DAYLIGHT_PRESETS.afternoon.sun.position));
  });

  it('햇빛은 모두 남쪽 창(z > 0) 바깥에서 들어온다', () => {
    for (const id of TIME_OF_DAY_ORDER) expect(DAYLIGHT_PRESETS[id].sun.position[2]).toBeGreaterThan(4.5);
  });

  it('색상 값은 #RRGGBB 형식이다', () => {
    for (const preset of Object.values(DAYLIGHT_PRESETS)) {
      for (const color of [preset.sun.color, preset.hemisphere.sky, preset.hemisphere.ground, preset.outsideTint, preset.background]) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });
});

describe('isTimeOfDay', () => {
  it('유효한 값만 허용한다', () => {
    expect(isTimeOfDay('evening')).toBe(true);
    expect(isTimeOfDay('night')).toBe(false);
    expect(isTimeOfDay(undefined)).toBe(false);
  });
});
