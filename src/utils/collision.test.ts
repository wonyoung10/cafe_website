import { describe, expect, it } from 'vitest';
import { COLLIDERS } from '@/components/three/scene/colliders';
import { COUNTER, ROOM_BOUNDS } from '@/components/three/scene/layout';
import { circleIntersectsAabb, clampToRoom, resolveMovement } from './collision';

describe('cafe collision', () => {
  it('clamps all room axes with a margin without mutating the point', () => {
    const point: [number, number, number] = [10, -1, -10];
    expect(clampToRoom(point, ROOM_BOUNDS, 0.25)).toEqual([5.75, 0.25, -4.25]);
    expect(point).toEqual([10, -1, -10]);
  });
  it('moves freely through an empty area and preserves eye height', () => {
    const result = resolveMovement([3, 1.6, 1], [0.2, 0, 0.4], COLLIDERS, 0.3, ROOM_BOUNDS);
    expect(result[0]).toBeCloseTo(3.2); expect(result[1]).toBe(1.6); expect(result[2]).toBeCloseTo(1.4);
  });
  it('slides along a wall instead of cancelling both axes', () => {
    const result = resolveMovement([5.7, 1.6, 0], [1, 0, 0.5], [], 0.3, ROOM_BOUNDS);
    expect(result[0]).toBeCloseTo(5.7); expect(result[2]).toBeCloseTo(0.5);
  });
  it('blocks the counter, including large movement deltas', () => {
    const result = resolveMovement([COUNTER.position[0], 1.6, -1.8], [0, 0, -4], COLLIDERS, 0.3, ROOM_BOUNDS);
    expect(result[2]).toBeGreaterThanOrEqual(-2.55);
  });
  it('slides beside furniture on an unblocked axis', () => {
    const result = resolveMovement([0, 1.6, 0.7], [0.6, 0, -0.5], [{ minX: -2, maxX: 2, minZ: -1, maxZ: 0.3 }], 0.3, ROOM_BOUNDS);
    expect(result[0]).toBeCloseTo(0.6); expect(result[2]).toBeGreaterThanOrEqual(0.6);
  });
  it('checks circle corners and permits tangent contact', () => {
    const box = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    expect(circleIntersectsAabb(-0.2, -0.2, 0.3, box)).toBe(true);
    expect(circleIntersectsAabb(-0.3, -0.3, 0.3, box)).toBe(false);
    expect(circleIntersectsAabb(1.3, 0.5, 0.3, box)).toBe(false);
  });
});
