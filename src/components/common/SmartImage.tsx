import { useState, type ImgHTMLAttributes } from 'react';
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

/**
 * 비율 박스 + 지연 로딩 + 페이드 인 + 실패 시 잎사귀 플레이스홀더.
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
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className={cn('relative overflow-hidden bg-cream', wrapperClassName)}>
      {status === 'error' ? (
        <LeafPlaceholder label={alt || undefined} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={(event) => {
            setStatus('loaded');
            onLoad?.(event);
          }}
          onError={(event) => {
            setStatus('error');
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
