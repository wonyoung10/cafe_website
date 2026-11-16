import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { MathUtils, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DEFAULT_VIEW, ROOM_BOUNDS, WALK_START } from '@/components/three/scene/layout';
import type { CameraView, StoreMode } from '@/types/three';
import { clampToRoom } from '@/utils/collision';
import WalkControls, { type WalkInput } from './WalkControls';

export interface ViewRequest { serial: number; view: CameraView }
interface Props { mode: StoreMode; request: ViewRequest; input: RefObject<WalkInput>; onReady: () => void }
export default function CameraRig({ mode, request, input, onReady }: Props) {
  const { camera } = useThree();
  const orbit = useRef<OrbitControlsImpl>(null);
  const target = useRef(new Vector3(...DEFAULT_VIEW.target));
  const goalPosition = useRef(new Vector3(...DEFAULT_VIEW.position));
  const goalTarget = useRef(new Vector3(...DEFAULT_VIEW.target));
  const busy = useRef(true);
  const firstFrame = useRef(false);
  const renderedFrames = useRef(0);
  const previousMode = useRef(mode);
  useEffect(() => {
    const view = mode === 'walk' ? { position: WALK_START, target: [0.5, 1.6, -2] as [number, number, number] } : request.view;
    goalPosition.current.fromArray(view.position);
    goalTarget.current.fromArray(view.target);
    if (previousMode.current === 'walk' && mode === 'orbit') {
      camera.getWorldDirection(target.current); target.current.add(camera.position);
    } else if (orbit.current && previousMode.current === 'orbit') target.current.copy(orbit.current.target);
    previousMode.current = mode;
    busy.current = true;
    if (orbit.current) orbit.current.enabled = false;
  }, [camera, mode, request]);
  useEffect(() => {
    const debug = Object.freeze({
      get mode() { return mode; },
      get ready() { return firstFrame.current; },
      getCamera: (): CameraView => ({ position: camera.position.toArray(), target: target.current.toArray() }),
    });
    window.__CAFE_3D__ = debug;
    return () => { if (window.__CAFE_3D__ === debug) delete window.__CAFE_3D__; };
  }, [camera, mode]);
  useFrame((_, delta) => {
    if (busy.current) {
      const dt = Math.min(delta, 0.05);
      for (const axis of ['x', 'y', 'z'] as const) {
        camera.position[axis] = MathUtils.damp(camera.position[axis], goalPosition.current[axis], 5, dt);
        target.current[axis] = MathUtils.damp(target.current[axis], goalTarget.current[axis], 5, dt);
      }
      camera.lookAt(target.current);
      if (orbit.current) {
        orbit.current.target.copy(target.current);
        // Updating a disabled controller keeps its spherical state in sync across modes.
        if (mode === 'orbit') orbit.current.update();
      }
      if (camera.position.distanceTo(goalPosition.current) < 0.015 && target.current.distanceTo(goalTarget.current) < 0.015) {
        camera.position.copy(goalPosition.current); target.current.copy(goalTarget.current);
        camera.lookAt(target.current); busy.current = false;
        if (mode === 'orbit' && orbit.current) { orbit.current.target.copy(target.current); orbit.current.update(); }
      }
    }
    if (mode === 'orbit') {
      if (orbit.current) {
        orbit.current.enabled = !busy.current;
        orbit.current.target.fromArray(clampToRoom(orbit.current.target.toArray(), ROOM_BOUNDS, 0.25));
        target.current.copy(orbit.current.target);
      }
      camera.position.fromArray(clampToRoom(camera.position.toArray(), ROOM_BOUNDS, 0.25));
      camera.lookAt(target.current);
    } else if (orbit.current) orbit.current.enabled = false;
    if (!firstFrame.current && renderedFrames.current++ > 0) { firstFrame.current = true; onReady(); }
  });
  return <>
    <OrbitControls ref={orbit} enabled={false} enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={9} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.49} enablePan screenSpacePanning={false} target={DEFAULT_VIEW.target} />
    <WalkControls active={mode === 'walk'} busy={busy} input={input} target={target} />
  </>;
}
