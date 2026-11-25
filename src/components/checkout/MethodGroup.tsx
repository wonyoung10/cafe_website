import { useId, type Ref } from 'react';

interface Props<T extends string> {
  legend: string;
  options: Record<T, string>;
  selected: T | null;
  onChange(value: T): void;
  error: string | null;
  firstRadio: Ref<HTMLInputElement>;
  disabled: boolean;
}

export default function MethodGroup<T extends string>({ legend, options, selected, onChange, error, firstRadio, disabled }: Props<T>) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 font-serif text-xl font-bold text-forest">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(options) as T[]).map((value, i) => (
          <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-leaf-sm border border-line px-4 has-checked:border-forest has-checked:bg-sage-soft">
            <input ref={i === 0 ? firstRadio : undefined} required type="radio" name={id} value={value}
              aria-invalid={Boolean(error)} aria-describedby={error ? id + '-error' : undefined}
              checked={selected === value} onChange={() => onChange(value)} className="accent-forest" />
            {options[value]}
          </label>
        ))}
      </div>
      {error && <p role="alert" id={id + '-error'} className="mt-1 text-sm text-walnut">{error}</p>}
    </fieldset>
  );
}
