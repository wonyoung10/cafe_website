import { useCallback, useEffect, useState } from 'react';
import { type CommerceError, mapError } from '@/services/errors';

interface Settled<T> {
  load: () => Promise<T>;
  attempt: number;
  data?: T;
  error?: CommerceError;
}

/**
 * load(useCallback으로 고정)가 바뀔 때마다 다시 읽는다. null이면 읽지 않는다.
 * 새 값을 기다리는 동안 data에는 직전 값이 남고, 늦게 도착한 이전 요청의 결과는 버린다.
 */
export function useLoad<T>(load: (() => Promise<T>) | null) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!load) return;
    let active = true;
    load().then(
      (data) => { if (active) setSettled({ load, attempt, data }); },
      (error: unknown) => { if (active) setSettled({ load, attempt, error: mapError(error) }); },
    );
    return () => { active = false; };
  }, [load, attempt]);

  const current = settled !== null && settled.load === load && settled.attempt === attempt;
  return {
    loading: !current,
    data: settled?.data,
    error: current ? settled.error : undefined,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
