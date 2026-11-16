import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'group inline-flex items-center justify-center gap-2 rounded-leaf-sm font-semibold transition-[background-color,color,border-color,box-shadow] duration-200 ease-[var(--ease-leaf)] disabled:pointer-events-none disabled:opacity-50';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-ivory shadow-soft hover:bg-forest-deep',
  secondary: 'border border-forest/30 bg-transparent text-forest hover:border-forest/50 hover:bg-forest/5',
  ghost: 'px-0 text-forest underline-offset-4 hover:underline',
  light: 'bg-ivory text-forest hover:bg-cream',
};

const SIZE: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-6 text-base',
};

export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(BASE, VARIANT[variant], variant !== 'ghost' && SIZE[size], variant === 'ghost' && 'h-auto', className);
}
