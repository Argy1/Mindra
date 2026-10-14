import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/** Pembungkus selebar 1200px dengan gutter responsif (design/landing.html `.wrap`). */
export function Container({ className, ...rest }: ComponentProps<'div'>) {
  return <div {...rest} className={cn('mx-auto w-full max-w-wrap px-gutter', className)} />;
}
