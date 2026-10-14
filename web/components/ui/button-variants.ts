import { cva } from 'class-variance-authority';

/**
 * Gaya tombol dipisah dari Button.tsx (komponen klien) supaya Server Component bisa memakainya untuk tautan
 * bergaya tombol, mis. unduhan berkas. Fungsi yang diekspor dari modul "use client" tidak bisa dipanggil di server.
 */
/** Gaya tombol (design/ui.css `.btn`). */
export const buttonVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill border-[1.5px] border-transparent',
    'leading-none font-semibold whitespace-nowrap no-underline select-none',
    'transition-[transform,background-color,border-color] duration-(--dur-fast) ease-out-soft',
    'active:scale-[0.96] motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-60',
    '[&>svg]:size-5 [&>svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-biru-500 text-fg-on-primary hover:bg-biru-600',
        secondary: 'border-line-medium bg-raised text-fg-1 hover:border-biru-300 hover:bg-biru-50',
        ghost: 'text-biru-600 hover:bg-[color-mix(in_oklab,currentColor_6%,transparent)]',
        // Desain memakai sage-500, tetapi teks putih di atasnya hanya 3,19:1. sage-600 = 4,76:1.
        sage: 'bg-sage-600 text-white hover:bg-sage-700',
        crisis: 'bg-danger-500 text-white hover:bg-danger-700',
      },
      size: {
        // `touch-target` memperluas area sentuh sm (40px) menjadi ≥ 44px tanpa mengubah tampilan.
        sm: 'touch-target min-h-10 px-4 text-sm',
        md: 'min-h-12 px-6 text-[0.9375rem]',
        lg: 'min-h-14 px-8 text-base',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);
