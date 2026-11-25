import { CircleAlert } from 'lucide-react';

/** 입력 칸 바로 아래의 오류. aria-describedby로 칸과 잇는다. */
export default function FieldError({ id, children }: { id: string; children: string | null }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-walnut">
      <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
      {children}
    </p>
  );
}
