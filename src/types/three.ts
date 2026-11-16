export type Point3 = [number, number, number];
export type StoreMode = 'orbit' | 'walk';
export interface CameraView { position: Point3; target: Point3 }
export interface Hotspot {
  id: string;
  title: string;
  description: string;
  position: Point3;
  camera: CameraView;
}
export interface CafeDebug {
  readonly mode: StoreMode;
  readonly ready: boolean;
  readonly getCamera: () => CameraView;
}
declare global {
  interface Window { __CAFE_3D__?: Readonly<CafeDebug> }
}
