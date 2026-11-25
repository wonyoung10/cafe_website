import { useId, useState } from 'react';
import { cn } from '@/utils/cn';

interface AuthFieldProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  autoComplete: 'username' | 'current-password' | 'new-password';
  pending: boolean;
  credentialsError?: string;
}

export default function AuthField({ name, label, hint, error, autoComplete, pending, credentialsError }: AuthFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const secret = autoComplete !== 'username';
  const descriptions = [hint && id + '-hint', error && id + '-error', credentialsError].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="font-semibold text-ink">{label}</label>
      {hint && <p id={id + '-hint'} className="mt-1 text-sm text-ink-soft">{hint}</p>}
      <div className="relative mt-2">
        <input
          id={id} name={name} required readOnly={pending}
          type={secret && !visible ? 'password' : 'text'}
          autoComplete={autoComplete} autoCapitalize="none" spellCheck={false}
          aria-invalid={Boolean(error || credentialsError)}
          aria-describedby={descriptions || undefined}
          className={cn(
            'h-12 w-full rounded-leaf-sm border bg-ivory px-4 text-ink',
            error || credentialsError ? 'border-walnut' : 'border-ink-soft',
            secret && 'pr-20',
          )}
        />
        {secret && (
          <button
            type="button" aria-controls={id} aria-label={label + (visible ? ' 숨기기' : ' 보기')}
            className="absolute inset-y-0 right-1 min-h-11 min-w-11 rounded-leaf-sm px-2 text-sm font-semibold text-forest"
            onClick={() => setVisible(!visible)}
          >
            {visible ? '숨기기' : '보기'}
          </button>
        )}
      </div>
      {error && <p id={id + '-error'} role="alert" className="mt-2 text-sm font-semibold text-walnut">{error}</p>}
    </div>
  );
}
