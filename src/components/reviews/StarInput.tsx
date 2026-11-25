import { Star } from 'lucide-react';
import { useState, type Ref } from 'react';
import FieldError from '@/components/reviews/FieldError';
import { cn } from '@/utils/cn';

const CHOICES = [
  [1, '아쉬웠어요'],
  [2, '조금 아쉬웠어요'],
  [3, '무난했어요'],
  [4, '좋았어요'],
  [5, '아주 좋았어요'],
] as const;

interface StarInputProps {
  /** 0은 아직 고르지 않음 */
  value: number;
  onChange: (value: number) => void;
  error: string | null;
  /** 오류가 났을 때 초점을 옮길 첫 번째 라디오 */
  firstRef: Ref<HTMLInputElement>;
}

/** 네이티브 라디오 묶음이라 방향키로 별점을 바꿀 수 있다 */
export default function StarInput({ value, onChange, error, firstRef }: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const word = CHOICES.find(([score]) => score === value)?.[1];

  return (
    <fieldset
      role="radiogroup"
      aria-labelledby="review-rating-label"
      aria-required
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? 'review-rating-error' : undefined}
      className="min-w-0"
    >
      <legend id="review-rating-label" className="font-semibold text-forest">별점</legend>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="-ml-2 flex" onPointerLeave={() => setHovered(0)}>
          {CHOICES.map(([score, label]) => (
            <label
              key={score}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(score); }}
              className="relative grid size-12 cursor-pointer place-items-center"
            >
              <input
                ref={score === 1 ? firstRef : undefined}
                type="radio"
                name="rating"
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                aria-label={`${score}점, ${label}`}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-leaf-sm outline-offset-[-3px]"
              />
              <Star
                aria-hidden
                strokeWidth={1.5}
                className={cn(
                  'pointer-events-none relative size-8 transition-colors duration-150',
                  score <= value ? 'fill-current text-walnut' : score <= hovered ? 'fill-walnut-soft text-walnut' : 'fill-ivory text-ink-soft',
                )}
              />
            </label>
          ))}
        </div>
        <p aria-hidden className="min-h-7 font-serif text-lg text-walnut">{word ? `${value}점, ${word}` : ''}</p>
      </div>
      <FieldError id="review-rating-error">{error}</FieldError>
    </fieldset>
  );
}
