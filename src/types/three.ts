export type Point3 = [number, number, number];
export type StoreMode = 'orbit' | 'walk';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
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
/** E2E 검증용 조명 상태 (읽기 전용) */
export interface CafeDaylightDebug {
  readonly timeOfDay: TimeOfDay;
  /** 전환이 끝나 목표 조명값에 도달했는지 */
  readonly settled: boolean;
  readonly getLevels: () => { sun: number; pendant: number; hemisphere: number };
}
declare global {
  interface Window {
    __CAFE_3D__?: Readonly<CafeDebug>;
    __CAFE_3D_DAYLIGHT__?: Readonly<CafeDaylightDebug>;
  }
}
