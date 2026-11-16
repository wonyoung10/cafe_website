import { useEffect } from 'react';
import { SITE_TITLE_SUFFIX } from '@/data/brand';

/** 페이지 제목을 "{title} · 브랜드명" 형태로 설정한다. title이 없으면 기본 제목. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_TITLE_SUFFIX}` : `${SITE_TITLE_SUFFIX} — 당신의 하루에, 잎사귀 하나`;
  }, [title]);
}
