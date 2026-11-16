import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 경로가 바뀌면 스크롤을 최상단으로 이동하고, 해시가 있으면 해당 요소로 이동한다.
 * 쿼리 문자열만 바뀌는 경우(메뉴 필터)는 현재 스크롤을 유지한다. (RT-09)
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
