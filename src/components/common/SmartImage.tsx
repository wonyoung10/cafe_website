import { useCallback, useState, type ImgHTMLAttributes } from 'react';
import LeafPlaceholder from '@/components/common/LeafPlaceholder';
import { cn } from '@/utils/cn';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  /** 래퍼(비율 박스) 클래스. 예: "aspect-square rounded-2xl" */
  wrapperClassName?: string;
  /** 히어로처럼 즉시 로드해야 하는 이미지 */
  priority?: boolean;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

/**
 * 비율 박스 + 지연 로딩 + 페이드 인 + 실패 시 잎사귀 플레이스홀더.
 *
 * 브라우저 캐시에 있던 이미지는 React가 onLoad를 연결하기 전에 로드가 끝나
 * load 이벤트를 놓칠 수 있다. 그래서 마운트 시점(ref)에 `complete` 상태도 확인한다.
 * 상태는 src별로 기억해 src가 바뀌면 자연스럽게 'loading'으로 돌아간다.
 */
export default function SmartImage({
  src,
  alt,
  wrapperClassName,
  className,
  priority = false,
  onLoad,
  onError,
  ...rest
}: SmartImageProps) {
  const [result, setResult] = useState<{ src: string; status: LoadStatus } | null>(null);
  const status: LoadStatus = result?.src === src ? result.status : 'loading';

  const imageRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete) setResult({ src, status: img.naturalWidth > 0 ? 'loaded' : 'error' });
    },
    [src],
  );

  return (
    <div className={cn('relative overflow-hidden bg-cream', wrapperClassName)}>
      {status === 'error' ? (
        <LeafPlaceholder label={alt || undefined} />
      ) : (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={(event) => {
            setResult({ src, status: 'loaded' });
            onLoad?.(event);
          }}
          onError={(event) => {
            setResult({ src, status: 'error' });
            onError?.(event);
          }}
          className={cn(
            'size-full object-cover transition-opacity duration-700 ease-[var(--ease-leaf)]',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            className,
          )}
          {...rest}
        />
      )}
    </div>
  );
}
