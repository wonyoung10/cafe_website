import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/common/Button';
import { buttonClassName } from '@/components/common/buttonStyles';
import FieldError from '@/components/reviews/FieldError';
import type { PhotoChange } from '@/types/commerce';
import { cn } from '@/utils/cn';
import { PHOTO_ACCEPT, PHOTO_UNREADABLE, resizePhoto, validatePhoto } from '@/utils/photo';

const PREVIEW = 'max-h-80 w-auto max-w-full rounded-leaf bg-cream';

/** 화면에서 사라지거나 사진이 바뀌면 object URL을 해제한다 */
function BlobImage({ blob, alt }: { blob: Blob; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return <img ref={ref} alt={alt} className={PREVIEW} />;
}

interface PhotoFieldProps {
  /** 수정할 때 이미 저장된 사진 */
  savedUrl: string | null;
  change: PhotoChange;
  onChange: (change: PhotoChange) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function PhotoField({ savedUrl, change, onChange, busy, onBusyChange }: PhotoFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);

  const chosen = typeof change === 'string' ? null : change;
  const saved = change === 'keep' ? savedUrl : null;
  const hasPhoto = Boolean(chosen ?? saved);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 사진을 다시 골라도 change 이벤트가 오도록 비워 둔다
    event.target.value = '';
    if (!file) return;
    const ticket = ++request.current;
    const invalid = validatePhoto(file);
    setError(invalid);
    onBusyChange(!invalid);
    if (invalid) return;
    try {
      const resized = await resizePhoto(file);
      if (request.current === ticket) onChange(resized);
    } catch {
      if (request.current === ticket) setError(PHOTO_UNREADABLE);
    } finally {
      if (request.current === ticket) onBusyChange(false);
    }
  };

  const take = (next: 'keep' | 'remove') => {
    request.current += 1;
    onBusyChange(false);
    setError(null);
    onChange(next);
    // 누른 버튼이 사라지므로 초점을 사진 고르기로 옮긴다
    input.current?.focus();
  };

  return (
    <div>
      <p id="review-photo-label" className="font-semibold text-forest">
        사진 <span className="font-normal text-ink-soft">(선택)</span>
      </p>
      <p id="review-photo-help" className="mt-1 text-sm text-ink-soft">JPG, PNG, WebP 한 장, 10MB까지 올릴 수 있어요.</p>

      {(chosen || saved) && (
        <div className="mt-4">
          {chosen
            ? <BlobImage blob={chosen} alt="고른 사진 미리보기" />
            : saved && <img src={saved} alt="지금 리뷰에 있는 사진" className={PREVIEW} />}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="relative inline-flex">
          <input
            ref={input}
            id="review-photo"
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={(event) => void choose(event)}
            aria-labelledby="review-photo-label review-photo-action"
            aria-describedby={cn('review-photo-help', error && 'review-photo-error')}
            aria-invalid={error ? true : undefined}
            className="peer sr-only"
          />
          <label
            id="review-photo-action"
            htmlFor="review-photo"
            className={buttonClassName('secondary', 'md', 'cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest')}
          >
            <ImagePlus aria-hidden className="size-[1.1em]" />
            {hasPhoto ? '사진 바꾸기' : '사진 고르기'}
          </label>
        </span>
        {hasPhoto && (
          <Button variant="ghost" className="min-h-11 text-[0.9375rem]" icon={<Trash2 aria-hidden className="size-[1.1em]" />} onClick={() => take('remove')}>
            사진 빼기
          </Button>
        )}
        {savedUrl && change !== 'keep' && (
          <Button variant="ghost" className="min-h-11 text-[0.9375rem]" icon={<RotateCcw aria-hidden className="size-[1.1em]" />} onClick={() => take('keep')}>
            원래 사진으로 되돌리기
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-ink-soft">
        {busy && <span className="mt-2 block">사진을 알맞은 크기로 줄이고 있어요.</span>}
      </p>
      <FieldError id="review-photo-error">{error}</FieldError>
    </div>
  );
}
