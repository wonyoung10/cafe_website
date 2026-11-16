import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { Euler, Vector3 } from 'three';
import { COLLIDERS, ROOM_BOUNDS } from '@/components/three/scene/colliders';
import { resolveMovement } from '@/utils/collision';

export type Direction = 'forward' | 'backward' | 'left' | 'right';
export interface WalkInput { forward: boolean; backward: boolean; left: boolean; right: boolean }
interface Props { active: boolean; busy: RefObject<boolean>; input: RefObject<WalkInput>; target: RefObject<Vector3> }
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export default function WalkControls({ active, busy, input, target }: Props) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: 0, pointer: -1, x: 0, y: 0 });
  const direction = useRef(new Vector3());
  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;
    const clear = () => {
      keys.current.clear(); look.current.pointer = -1;
      Object.assign(input.current, { forward: false, backward: false, left: false, right: false });
    };
    const down = (event: KeyboardEvent) => {
      if (isTyping(event.target) || !movementKeys.has(event.code)) return;
      // Let keyboard activation/navigation of toolbar and hotspot buttons keep working.
      if (event.target instanceof HTMLElement && event.target.closest('button') && event.code.startsWith('Arrow')) return;
      event.preventDefault(); keys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const pointerDown = (event: PointerEvent) => {
      if (busy.current || event.button !== 0 || look.current.pointer !== -1) return;
      const euler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      Object.assign(look.current, { yaw: euler.y, pitch: euler.x, pointer: event.pointerId, x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const state = look.current;
      if (state.pointer !== event.pointerId || busy.current) return;
      state.yaw -= (event.clientX - state.x) * 0.004;
      state.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, state.pitch - (event.clientY - state.y) * 0.004));
      state.x = event.clientX; state.y = event.clientY;
      camera.quaternion.setFromEuler(new Euler(state.pitch, state.yaw, 0, 'YXZ'));
    };
    const pointerUp = (event: PointerEvent) => {
      if (look.current.pointer !== event.pointerId) return;
      look.current.pointer = -1;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onVisibility = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('lostpointercapture', pointerUp);
    return () => {
      clear();
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp);
    };
  }, [active, busy, camera, gl, input]);
  useFrame((_, frameDelta) => {
    if (!active || busy.current) return;
    const held = keys.current; const pad = input.current;
    const forward = Number(pad.forward || held.has('KeyW') || held.has('ArrowUp')) - Number(pad.backward || held.has('KeyS') || held.has('ArrowDown'));
    const right = Number(pad.right || held.has('KeyD') || held.has('ArrowRight')) - Number(pad.left || held.has('KeyA') || held.has('ArrowLeft'));
    const yaw = new Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    const length = Math.hypot(forward, right) || 1;
    const distance = Math.min(frameDelta, 0.05) * (held.has('ShiftLeft') || held.has('ShiftRight') ? 3.8 : 2.2) / length;
    const position = resolveMovement(camera.position.toArray(), [(right * Math.cos(yaw) - forward * Math.sin(yaw)) * distance, 0, (-forward * Math.cos(yaw) - right * Math.sin(yaw)) * distance], COLLIDERS, 0.3, ROOM_BOUNDS);
    camera.position.set(position[0], 1.6, position[2]);
    camera.getWorldDirection(direction.current);
    target.current.copy(camera.position).add(direction.current);
  });
  return null;
}
