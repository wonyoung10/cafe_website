import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '@/utils/cn';

type ContainerProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

export default function Container<T extends ElementType = 'div'>({ as, className, ...rest }: ContainerProps<T>) {
  const Component = as ?? 'div';
  return <Component className={cn('mx-auto w-full max-w-6xl px-5 md:px-8', className)} {...rest} />;
}
