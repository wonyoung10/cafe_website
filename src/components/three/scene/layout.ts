import type { CameraView, Point3 } from '@/types/three';
import type { RoomBounds } from '@/utils/collision';

export const ROOM_BOUNDS: RoomBounds = { minX: -6, maxX: 6, minY: 0, maxY: 3.2, minZ: -4.5, maxZ: 4.5 };
export const DEFAULT_VIEW: CameraView = { position: [4.8, 2.6, 3.8], target: [0, 1, -1] };
export const WALK_START: Point3 = [3.4, 1.6, 1.8];
export const COUNTER = { position: [1, 0.525, -3.2] as Point3, size: [5, 1.05, 0.7] as Point3 };
export const DISPLAY = { position: [4.6, 0.65, -3] as Point3, size: [1.3, 1.3, 1] as Point3 };
export const WINDOW_BAR = { position: [-1, 0.95, 3.7] as Point3, size: [6, 0.12, 0.6] as Point3 };
export const TABLES: Point3[] = [[-2.5, 0, 0.2], [0.8, 0, 0.6]];
export const PLANTERS: Point3[] = [[-5.25, 0, -1.9], [4.95, 0, 0.8], [3.45, 0, -4]];
export const PENDANTS: Point3[] = [[-2.5, 2.65, 0.2], [0.8, 2.65, 0.6], [-0.4, 2.65, -3.2], [2.5, 2.65, -3.2]];
export const CHAIRS = TABLES.flatMap(([x, , z]) => [-1, 1].map((side) => ({ position: [x + side * 0.8, 0, z] as Point3, rotation: side === -1 ? -Math.PI / 2 : Math.PI / 2 })));
export const STOOLS: Point3[] = [-3.25, -1.75, -0.25, 1.25].map((x) => [x, 0, 2.9]);
