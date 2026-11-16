import { Leaf } from 'lucide-react';
import { useCallback } from 'react';
import { HOTSPOTS } from '@/data/hotspots';
import type { Hotspot } from '@/types/three';
import type { MarkerElements } from './HotspotProjector';

interface HotspotMarkersProps {
  activeId?: string;
  onSelect: (spot: Hotspot) => void;
  markers: MarkerElements;
}

/** 캔버스 위 HTML 오버레이 마커. 위치는 HotspotProjector가 매 프레임 갱신한다. */
export default function HotspotMarkers({ activeId, onSelect, markers }: HotspotMarkersProps) {
  const register = useCallback(
    (id: string) => (element: HTMLButtonElement | null) => {
      const map = markers.current;
      if (!map) return;
      if (element) map.set(id, element);
      else map.delete(id);
    },
    [markers],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" data-testid="hotspot-markers">
      {HOTSPOTS.map((spot) => (
        <button
          key={spot.id}
          ref={register(spot.id)}
          type="button"
          aria-label={spot.title}
          aria-pressed={activeId === spot.id}
          onClick={() => onSelect(spot)}
          style={{ visibility: 'hidden' }}
          className={`group pointer-events-auto absolute top-0 left-0 flex size-11 items-center justify-center rounded-full border border-forest/25 shadow-soft transition-colors will-change-transform ${activeId === spot.id ? 'bg-forest text-ivory' : 'bg-ivory/95 text-forest hover:bg-sage-soft'}`}
        >
          <Leaf aria-hidden className="size-5" />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-full bg-forest px-3 py-1 text-xs text-ivory opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {spot.title}
          </span>
        </button>
      ))}
    </div>
  );
}
