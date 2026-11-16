import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

export function useMedia(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, [query]);
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
const documentVisible = () => !document.hidden;
export function useSceneVisible(ref: RefObject<HTMLElement | null>) {
  const visible = useSyncExternalStore(subscribeVisibility, documentVisible, () => true);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry) setInView(entry.isIntersecting); }, { rootMargin: '50px' });
    const element = ref.current;
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible && inView;
}
