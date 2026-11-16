import { Html } from '@react-three/drei';
import { Leaf } from 'lucide-react';
import { HOTSPOTS } from '@/data/hotspots';
import type { Hotspot } from '@/types/three';
export default function HotspotMarkers({ activeId, onSelect }: { activeId?: string; onSelect: (spot: Hotspot) => void }) {
  return <>{HOTSPOTS.map((spot) => <Html key={spot.id} position={spot.position} center distanceFactor={7} zIndexRange={[20, 0]}>
    <button type="button" aria-label={spot.title} aria-pressed={activeId === spot.id} onClick={() => onSelect(spot)}
      className={`group relative flex size-11 items-center justify-center rounded-full border border-forest/25 shadow-soft transition-colors ${activeId === spot.id ? 'bg-forest text-ivory' : 'bg-ivory/95 text-forest hover:bg-sage-soft'}`}>
      <Leaf aria-hidden className="size-5" /><span aria-hidden className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-full bg-forest px-3 py-1 text-xs text-ivory opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{spot.title}</span>
    </button>
  </Html>)}</>;
}
