import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Blok pengganti konten yang sedang dimuat. Dekoratif (`aria-hidden`); beri tahu pembaca layar
 * lewat wadahnya (lihat <SkeletonCard>). Animasi berdenyut mati bila reduced-motion.
 */
export function Skeleton({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      {...rest}
      aria-hidden
      className={cn(
        'animate-shimmer rounded-md bg-neutral-100 motion-reduce:animate-none',
        className,
      )}
    />
  );
}
