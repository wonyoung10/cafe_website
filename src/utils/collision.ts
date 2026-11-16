import type { Point3 } from '@/types/three';

export interface RoomBounds { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
export interface Aabb { minX: number; maxX: number; minZ: number; maxZ: number }
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function clampToRoom(point: readonly [number, number, number], bounds: RoomBounds, margin = 0): Point3 {
  return [clamp(point[0], bounds.minX + margin, bounds.maxX - margin),
    clamp(point[1], bounds.minY + margin, bounds.maxY - margin),
    clamp(point[2], bounds.minZ + margin, bounds.maxZ - margin)];
}

export function circleIntersectsAabb(x: number, z: number, r: number, box: Aabb): boolean {
  const dx = x - clamp(x, box.minX, box.maxX);
  const dz = z - clamp(z, box.minZ, box.maxZ);
  return dx * dx + dz * dz < r * r;
}

/** Substeps prevent tunnelling after a slow frame; independent axes permit sliding. */
export function resolveMovement(position: readonly [number, number, number], delta: readonly [number, number, number], colliders: readonly Aabb[], radius: number, bounds: RoomBounds): Point3 {
  const next = clampToRoom(position, bounds, radius);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta[0]), Math.abs(delta[2])) / Math.max(radius * 0.5, 0.01)));
  for (let i = 0; i < steps; i++) {
    const x = clamp(next[0] + delta[0] / steps, bounds.minX + radius, bounds.maxX - radius);
    if (!colliders.some((box) => circleIntersectsAabb(x, next[2], radius, box))) next[0] = x;
    const z = clamp(next[2] + delta[2] / steps, bounds.minZ + radius, bounds.maxZ - radius);
    if (!colliders.some((box) => circleIntersectsAabb(next[0], z, radius, box))) next[2] = z;
  }
  return next;
}
