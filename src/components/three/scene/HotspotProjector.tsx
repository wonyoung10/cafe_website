import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';
import { Vector3 } from 'three';
import { HOTSPOTS } from '@/data/hotspots';

export type MarkerElements = RefObject<Map<string, HTMLElement>>;

const MIN_SCALE = 0.72;
const MAX_SCALE = 1.15;

/**
 * 핫스팟의 3D 위치를 매 프레임 화면 좌표로 투영해 캔버스 밖(React가 관리하는 오버레이)의
 * 마커 버튼 위치를 갱신한다.
 *
 * drei `Html`은 마커마다 별도 React root를 만들어, 라우트 이동으로 Canvas가 언마운트될 때
 * "removeChild" / "synchronously unmount a root" 오류를 일으켰다. 이 방식은 추가 root가 없다.
 */
export default function HotspotProjector({ markers }: { markers: MarkerElements }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const points = useMemo(() => HOTSPOTS.map((spot) => ({ id: spot.id, world: new Vector3(...spot.position) })), []);
  const projected = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const elements = markers.current;
    if (!elements) return;
    for (const point of points) {
      const element = elements.get(point.id);
      if (!element) continue;
      projected.copy(point.world).project(camera);
      const inFront = projected.z > -1 && projected.z < 1;
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      const onScreen = inFront && x > -40 && x < size.width + 40 && y > -40 && y < size.height + 40;
      if (!onScreen) {
        element.style.visibility = 'hidden';
        continue;
      }
      const distance = camera.position.distanceTo(point.world);
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, 4.5 / Math.max(distance, 0.1)));
      element.style.visibility = 'visible';
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      element.style.zIndex = String(Math.round(100 - distance * 5));
    }
  });

  return null;
}
