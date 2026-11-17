import Badge from '@/components/common/Badge';
import type { Temperature } from '@/types/menu';
import { cn } from '@/utils/cn';

export default function TemperatureBadges({ temperatures, className = 'mt-4' }: { temperatures: readonly Temperature[]; className?: string }) {
  if (!temperatures.length) return null;
  return (
    <div className={cn('flex gap-1.5', className)} aria-label="제공 온도">
      {temperatures.map((temperature) => <Badge key={temperature} tone={temperature}>{temperature.toUpperCase()}</Badge>)}
    </div>
  );
}
