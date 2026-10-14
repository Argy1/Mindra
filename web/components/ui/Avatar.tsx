import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { getInitials } from '@/lib/utils/initials';
import { cn } from '@/lib/utils/cn';

const avatarVariants = cva(
  'inline-grid shrink-0 place-items-center rounded-full font-bold select-none',
  {
    variants: {
      tone: {
        sage: 'bg-sage-100 text-sage-800',
        biru: 'bg-biru-100 text-biru-800',
        matahari: 'bg-matahari-100 text-matahari-800',
      },
      size: {
        sm: 'size-8 text-xs [&>svg]:size-4',
        md: 'size-10 text-sm [&>svg]:size-5',
      },
    },
    defaultVariants: { tone: 'sage', size: 'md' },
  },
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Nama lengkap; inisial dihitung otomatis ("Rina Sari, M.Psi." → RS). */
  name?: string;
  /** Ganti inisial dengan ikon (mis. gedung untuk faskes). */
  children?: ReactNode;
  /**
   * Avatar yang berdiri sendiri perlu nama aksesibel. Bila nama sudah tertulis di sebelahnya
   * (kasus umum), biarkan kosong — avatar disembunyikan dari pembaca layar.
   */
  label?: string;
  className?: string;
}

/** Avatar lingkaran berisi inisial atau ikon (design/ui.css `.avatar`). */
export function Avatar({ name, children, label, tone, size, className }: AvatarProps) {
  const accessibility = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : { 'aria-hidden': true };
  return (
    <span {...accessibility} className={cn(avatarVariants({ tone, size }), className)}>
      {children ?? (name ? getInitials(name) : null)}
    </span>
  );
}
