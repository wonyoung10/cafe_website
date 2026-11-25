import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { buttonClassName } from '@/components/common/buttonStyles';
import ReviewPhoto from '@/components/reviews/ReviewPhoto';
import StarRating from '@/components/reviews/StarRating';
import { formatDay, menuName } from '@/components/reviews/reviewQuery';
import { mapError } from '@/services/errors';
import type { ReviewView } from '@/types/commerce';
import { cn } from '@/utils/cn';

function OwnActions({ review, onDelete }: { review: ReviewView; onDelete: (id: string) => Promise<void> }) {
  const name = menuName(review.menuId);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const safeChoice = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  // 확인 단계를 열면 안전한 선택지로, 닫으면 삭제 버튼으로 초점을 돌려준다
  useEffect(() => {
    if (confirming) safeChoice.current?.focus();
    else if (opened.current) opener.current?.focus();
    opened.current = confirming;
  }, [confirming]);

  const cancel = () => {
    if (deleting) return;
    setConfirming(false);
    setError(null);
  };

  const confirm = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(review.id);
    } catch (reason) {
      setError(mapError(reason).message);
      setDeleting(false);
    }
  };

  if (confirming) {
    return (
      <div
        role="group"
        aria-label={`${name} 리뷰 삭제 확인`}
        onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); }}
        className="mt-6 rounded-leaf border border-line bg-cream px-5 py-5"
      >
        <p id={`review-${review.id}-confirm`} className="font-semibold text-forest">이 리뷰를 삭제할까요? <span className="block font-normal text-ink-soft">삭제하면 되돌릴 수 없어요.</span></p>
        <div role="alert">{error && <p className="mt-2 text-sm font-semibold text-walnut">{error}</p>}</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button ref={safeChoice} type="button" aria-describedby={`review-${review.id}-confirm`} onClick={cancel} className={buttonClassName('secondary')}>남겨 두기</button>
          <Button aria-disabled={deleting || undefined} onClick={() => void confirm()}>{deleting ? '삭제하는 중' : '삭제하기'}</Button>
        </div>
      </div>
    );
  }

  const quiet = buttonClassName('ghost', 'md', 'min-h-11 min-w-11 text-sm');
  return (
    <div className="mt-3 flex gap-6">
      <Link to={`/reviews/${review.id}/edit`} aria-label={`${name} 리뷰 수정`} className={quiet}>
        <Pencil aria-hidden className="size-4" />수정
      </Link>
      <button ref={opener} type="button" aria-label={`${name} 리뷰 삭제`} onClick={() => setConfirming(true)} className={quiet}>
        <Trash2 aria-hidden className="size-4" />삭제
      </button>
    </div>
  );
}

interface ReviewEntryProps {
  review: ReviewView;
  onDelete: (id: string) => Promise<void>;
}

/** 리뷰 한 편. 카드로 가두지 않고 글이 먼저 읽히게 둔다. */
export default function ReviewEntry({ review, onDelete }: ReviewEntryProps) {
  const name = menuName(review.menuId);
  const titleId = `review-${review.id}-title`;
  return (
    <article aria-labelledby={titleId} className="border-t border-line py-9 first:border-t-0 first:pt-0 last:pb-0 md:py-12">
      <div className={cn('grid min-w-0 gap-x-10', review.photoUrl && 'md:grid-cols-[minmax(0,1fr)_15rem] md:grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_17rem]')}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 id={titleId} tabIndex={-1} className="font-serif text-xl font-bold text-forest">{name}</h2>
            <StarRating value={review.rating} className="text-base" />
          </div>
          <p className="mt-4 max-w-[38rem] font-serif text-lg leading-[1.95] whitespace-pre-line text-ink [overflow-wrap:anywhere]">{review.text}</p>
          <p className="mt-5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
            <span className="font-semibold text-walnut">{review.authorMasked}</span>
            <time dateTime={review.createdAt}>{formatDay(review.createdAt)}</time>
            {review.updatedAt && <span>수정됨</span>}
            {review.isMine && <span>내 리뷰</span>}
          </p>
        </div>
        {review.photoUrl && (
          <div className="mt-6 md:col-start-2 md:row-span-2 md:mt-0">
            <ReviewPhoto src={review.photoUrl} alt={`${review.authorMasked} 님이 올린 ${name} 사진`} />
          </div>
        )}
        {review.isMine && <div className="min-w-0 md:col-start-1"><OwnActions review={review} onDelete={onDelete} /></div>}
      </div>
    </article>
  );
}
