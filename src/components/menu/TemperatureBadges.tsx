import Badge from '@/components/common/Badge';
import type { Temperature } from '@/types/menu';

export default function TemperatureBadges({ temperatures }: { temperatures: readonly Temperature[] }) {
  if (!temperatures.length) return null;
  return (
    <div className="mt-4 flex gap-1.5" aria-label="제공 온도">
      {temperatures.map((temperature) => <Badge key={temperature} tone={temperature}>{temperature.toUpperCase()}</Badge>)}
    </div>
  );
}
