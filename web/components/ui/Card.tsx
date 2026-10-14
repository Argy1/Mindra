import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const cardVariants = cva('rounded-lg bg-raised p-6', {
  variants: {
    variant: {
      raised: 'shadow-sm',
      flat: 'border border-line-soft',
      sunken: 'bg-sunken',
    },
    /** Kartu "momen utama" halaman: sudut lebih besar, padding lebih lega. */
    hero: { true: 'rounded-xl p-8 max-sm:p-5', false: '' },
  },
  defaultVariants: { variant: 'raised', hero: false },
});

interface CardProps extends ComponentProps<'div'>, VariantProps<typeof cardVariants> {
  /** Elemen HTML. Pakai `section` + `aria-labelledby` bila kartu punya judul. */
  as?: 'div' | 'section' | 'article' | 'aside';
}

/** Kartu putih di atas kanvas krem (design/ui.css `.card`). */
export function Card({ as: Tag = 'div', variant, hero, className, ...rest }: CardProps) {
  return <Tag {...rest} className={cn(cardVariants({ variant, hero }), className)} />;
}
