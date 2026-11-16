import { cn } from '@/utils/cn';

/* 창밖 나뭇가지가 드리우는 그림자. 가지 곡선을 따라 잎을 번갈아 단다. */
const LEAF = 'M0 0C-15 -10 -17 -34 -2 -52C13 -38 15 -14 0 0Z';

type Point = { x: number; y: number };

function quad(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

function angleAt(p0: Point, p1: Point, p2: Point, t: number) {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

interface Branch {
  from: Point;
  ctrl: Point;
  to: Point;
  leaves: number;
  scale: number;
}

const BRANCHES: Branch[] = [
  { from: { x: -40, y: -30 }, ctrl: { x: 260, y: 40 }, to: { x: 640, y: 250 }, leaves: 11, scale: 1.9 },
  { from: { x: 120, y: 30 }, ctrl: { x: 230, y: 210 }, to: { x: 420, y: 430 }, leaves: 7, scale: 1.5 },
  { from: { x: -30, y: 260 }, ctrl: { x: 120, y: 300 }, to: { x: 260, y: 470 }, leaves: 5, scale: 1.3 },
];

const SHAPES = BRANCHES.map((branch, branchIndex) => {
  const { from, ctrl, to } = branch;
  const leaves = Array.from({ length: branch.leaves }, (_, index) => {
    const t = 0.12 + (index / branch.leaves) * 0.86;
    const point = quad(from, ctrl, to, t);
    const side = index % 2 === 0 ? -1 : 1;
    // 잎은 가지 진행 방향 쪽으로 기울어 자란다 (+90은 LEAF가 위를 향하기 때문)
    const rotate = angleAt(from, ctrl, to, t) + 90 + side * 52 + ((index * 37 + branchIndex * 11) % 17) - 8;
    const scale = branch.scale * (0.78 + ((index * 53) % 30) / 100);
    return { key: `${branchIndex}-${index}`, transform: `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(2)})` };
  });
  return { key: branchIndex, d: `M${from.x} ${from.y}Q${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`, leaves };
});

/** 히어로 배경에 드리우는 나뭇잎 그림자 (장식, 스크린리더 제외) */
export default function LeafShade({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute -z-10 overflow-hidden', className)}>
      <svg viewBox="0 0 700 500" className="animate-leaf-sway size-full overflow-visible blur-[7px]" preserveAspectRatio="xMinYMin slice">
        <g fill="var(--color-forest)" stroke="var(--color-forest)">
          {SHAPES.map((branch) => (
            <g key={branch.key}>
              <path d={branch.d} fill="none" strokeWidth={6} strokeLinecap="round" />
              {branch.leaves.map((leaf) => (
                <path key={leaf.key} d={LEAF} transform={leaf.transform} stroke="none" />
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
