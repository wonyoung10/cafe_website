import { describe, expect, it } from 'vitest';
import { ROOM_BOUNDS } from '@/components/three/scene/layout';
import { clampToRoom } from '@/utils/collision';
import { HOTSPOTS } from './hotspots';

describe('hotspot data', () => {
  it('has six unique spaces, each with a Korean title and two sentences', () => {
    expect(HOTSPOTS).toHaveLength(6);
    expect(new Set(HOTSPOTS.map((spot) => spot.id)).size).toBe(6);
    for (const spot of HOTSPOTS) {
      expect(spot.title).toMatch(/[가-힣]/);
      expect(spot.description.split('.').filter(Boolean)).toHaveLength(2);
    }
  });
  it('keeps all markers and camera views inside the room', () => {
    for (const spot of HOTSPOTS) for (const point of [spot.position, spot.camera.position, spot.camera.target]) {
      expect(point.every(Number.isFinite)).toBe(true);
      expect(clampToRoom(point, ROOM_BOUNDS)).toEqual(point);
    }
  });
});
