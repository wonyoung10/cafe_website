import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { RefObject } from 'react';
import type { Direction, WalkInput } from './WalkControls';
const directions = [
  { key: 'forward', label: '앞으로', Icon: ArrowUp, className: 'col-start-2 row-start-1' },
  { key: 'left', label: '왼쪽', Icon: ArrowLeft, className: 'col-start-1 row-start-2' },
  { key: 'backward', label: '뒤로', Icon: ArrowDown, className: 'col-start-2 row-start-2' },
  { key: 'right', label: '오른쪽', Icon: ArrowRight, className: 'col-start-3 row-start-2' },
] as const;
export default function DirectionPad({ input }: { input: RefObject<WalkInput> }) {
  const set = (direction: Direction, pressed: boolean) => { input.current[direction] = pressed; };
  return <div role="group" aria-label="이동 방향 패드" className="absolute right-3 bottom-20 z-10 grid touch-none grid-cols-[repeat(3,56px)] grid-rows-[repeat(2,56px)] gap-1 select-none">
    {directions.map(({ key, label, Icon, className }) => <button key={key} type="button" aria-label={label}
      className={`${className} flex size-14 items-center justify-center rounded-2xl border border-line bg-ivory/95 text-forest shadow-soft active:bg-sage-soft`}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); set(key, true); }}
      onPointerUp={() => set(key, false)} onPointerLeave={() => set(key, false)} onPointerCancel={() => set(key, false)} onLostPointerCapture={() => set(key, false)}
      onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); set(key, true); } }}
      onKeyUp={() => set(key, false)} onBlur={() => set(key, false)}><Icon aria-hidden className="size-5" /></button>)}
  </div>;
}
