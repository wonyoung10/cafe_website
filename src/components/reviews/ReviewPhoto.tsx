import { useState } from 'react';
import SmartImage from '@/components/common/SmartImage';

const MIN_RATIO = 4 / 5;
const MAX_RATIO = 3 / 2;

/** 사진 원래 비율을 살리되, 지나치게 길거나 납작한 사진은 4:5~3:2 안으로 맞춘다 */
export default function ReviewPhoto({ src, alt }: { src: string; alt: string }) {
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <div style={{ aspectRatio: ratio }} className="w-full max-w-md">
      <SmartImage
        src={src}
        alt={alt}
        wrapperClassName="size-full rounded-leaf"
        onLoad={({ currentTarget: { naturalWidth, naturalHeight } }) => {
          if (naturalWidth && naturalHeight) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, naturalWidth / naturalHeight)));
        }}
      />
    </div>
  );
}
