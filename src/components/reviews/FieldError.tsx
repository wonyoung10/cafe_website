import { CircleAlert } from 'lucide-react';

/** 입력 칸 바로 아래의 오류. aria-describedby로 칸과 잇는다. 초점이 칸으로 가지 않는 오류는 announce로 읽어 준다. */
export default function FieldError({ id, children, announce = false }: { id: string; children: string | null; announce?: boolean }) {
  if (!children) return null;
  return (
    <p id={id} role={announce ? 'alert' : undefined} className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-walnut">
      <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
      {children}
    </p>
  );
}
