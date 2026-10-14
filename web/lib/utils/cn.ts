import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Utilitas tipografi buatan sendiri di app/globals.css (@utility). Saling menimpa. */
const TYPE_UTILITIES = [
  'display-1',
  'display-2',
  'display-3',
  'h1',
  'h2',
  'h3',
  'lead',
  'body-m',
  'meta',
];

// Beri tahu tailwind-merge tentang token Mindra supaya `rounded-pill` menimpa `rounded-lg`
// dan `h3` menimpa `h2`, bukan keduanya ikut terbawa.
const twMerge = extendTailwindMerge<'mindra-type'>({
  extend: {
    theme: {
      radius: ['pill'],
      shadow: ['glow-biru', 'glow-sage'],
    },
    classGroups: {
      'mindra-type': TYPE_UTILITIES,
    },
  },
});

/** Gabungkan class kondisional (clsx) dan selesaikan konflik utilitas Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
