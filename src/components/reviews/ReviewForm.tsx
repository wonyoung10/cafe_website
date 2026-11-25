import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/common/Button';
import FieldError from '@/components/reviews/FieldError';
import PhotoField from '@/components/reviews/PhotoField';
import StarInput from '@/components/reviews/StarInput';
import { REVIEW_TEXT_MAX, reviewTextLength, validateRating, validateReviewText } from '@/components/reviews/reviewText';
import { type CommerceError, mapError } from '@/services/errors';
import type { PhotoChange, ReviewInput } from '@/types/commerce';
import { cn } from '@/utils/cn';

interface ReviewFormProps {
  initial?: ReviewInput;
  savedPhotoUrl?: string | null;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (input: ReviewInput, photo: PhotoChange) => Promise<void>;
}

export default function ReviewForm({ initial, savedPhotoUrl = null, submitLabel, cancelTo, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [text, setText] = useState(initial?.text ?? '');
  const [photo, setPhoto] = useState<PhotoChange>('keep');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<CommerceError | null>(null);
  const firstStar = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const length = reviewTextLength(text);
  const over = length > REVIEW_TEXT_MAX;
  const ratingError = attempted ? validateRating(rating) : null;
  // 글자 수 초과는 쓰는 동안 바로, 빈 글은 저장을 누른 뒤에 알린다
  const textError = attempted || over ? validateReviewText(text) : null;
  const blocked = saving || photoBusy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    setAttempted(true);
    setFailure(null);
    if (validateRating(rating)) { firstStar.current?.focus(); return; }
    if (validateReviewText(text)) { textarea.current?.focus(); return; }
    setSaving(true);
    try {
      await onSubmit({ rating, text: text.trim() }, photo);
    } catch (error) {
      setFailure(mapError(error));
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-9">
      <StarInput value={rating} onChange={setRating} error={ratingError} firstRef={firstStar} />

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="review-text" className="font-semibold text-forest">리뷰</label>
          <p id="review-text-count" className={cn('text-sm tabular-nums', over ? 'font-semibold text-walnut' : 'text-ink-soft')}>
            <span className="sr-only">글자 수 </span>{length} / {REVIEW_TEXT_MAX}
          </p>
        </div>
        <textarea
          ref={textarea}
          id="review-text"
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-required
          aria-invalid={textError ? true : undefined}
          aria-describedby={cn('review-text-count', textError && 'review-text-error')}
          placeholder="맛, 향, 곁들인 것, 머문 시간까지 무엇이든 좋아요."
          className={cn(
            'mt-2 block w-full resize-y rounded-leaf border bg-ivory px-5 py-4 font-serif text-lg leading-[1.9] text-ink [overflow-wrap:anywhere] placeholder:text-ink-soft',
            textError ? 'border-walnut' : 'border-line hover:border-forest/40',
          )}
        />
        <FieldError id="review-text-error">{textError}</FieldError>
      </div>

      <PhotoField savedUrl={savedPhotoUrl} change={photo} onChange={setPhoto} busy={photoBusy} onBusyChange={setPhotoBusy} />

      <div className="border-t border-line pt-7">
        <div role="alert">
          {failure && (
            <p className="mb-5 font-semibold text-walnut">
              {failure.message}
              {failure.code === 'already-reviewed' && (
                <> <Link to="/reviews?mine=1" className="underline underline-offset-4">내 리뷰 보기</Link></>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button type="submit" size="lg" aria-disabled={blocked || undefined} className="aria-disabled:opacity-60">
            {saving ? '저장하는 중' : submitLabel}
          </Button>
          <ButtonLink to={cancelTo} variant="ghost" className="min-h-11 px-2">그만두기</ButtonLink>
        </div>
      </div>
    </form>
  );
}
