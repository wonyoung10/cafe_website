import type { Aabb } from '@/utils/collision';
import type { Point3 } from '@/types/three';
import { CHAIRS, COUNTER, DISPLAY, PLANTERS, STOOLS, TABLES, WINDOW_BAR } from './layout';
export { ROOM_BOUNDS } from './layout';
const box = (position: Point3, width: number, depth: number): Aabb => ({ minX: position[0] - width / 2, maxX: position[0] + width / 2, minZ: position[2] - depth / 2, maxZ: position[2] + depth / 2 });
export const COLLIDERS: readonly Aabb[] = [
  box(COUNTER.position, COUNTER.size[0], COUNTER.size[2]),
  box(DISPLAY.position, DISPLAY.size[0], DISPLAY.size[2]),
  box(WINDOW_BAR.position, WINDOW_BAR.size[0], WINDOW_BAR.size[2]),
  ...TABLES.map((p) => box(p, 0.9, 0.9)),
  ...CHAIRS.map(({ position }) => box(position, 0.48, 0.48)),
  ...STOOLS.map((p) => box(p, 0.42, 0.42)),
  ...PLANTERS.map((p) => box(p, 0.65, 0.65)),
];
