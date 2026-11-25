import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/common/Button';
import { mapError } from '@/services/errors';

type Result<T> = { data: T } | { error: string };

interface Props<T> {
  load: () => Promise<T>;
  loadingLabel: string;
  children(value: T): ReactNode;
}

export default function OrderData<T>({ load, loadingLabel, children }: Props<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  useEffect(() => {
    let active = true;
    void load().then(data => {
      if (active) setResult({ data });
    }, cause => {
      if (active) setResult({ error: mapError(cause).message });
    });
    return () => { active = false; };
  }, [load, attempt]);
  if (!result) return <p role="status" className="text-ink-soft">{loadingLabel}</p>;
  if ('error' in result) return (
    <div>
      <p role="alert" className="mb-2 text-walnut">{result.error}</p>
      <Button variant="secondary" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>다시 불러오기</Button>
    </div>
  );
  return children(result.data);
}
