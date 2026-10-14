import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

export const badgeVariants = cva(
  'inline-flex h-[1.625rem] items-center gap-1.5 rounded-pill px-2.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-100 text-fg-2',
        // Empat tone kategori skrining (selaras SQL classify_assessment)
        minimal: 'bg-success-50 text-success-700',
        mild: 'bg-info-50 text-info-700',
        moderate: 'bg-warning-50 text-warning-700',
        severe: 'bg-danger-50 text-danger-700',
        sage: 'bg-sage-50 text-sage-700',
      },
      dot: {
        true: "before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        false: '',
      },
    },
    defaultVariants: { tone: 'neutral', dot: true },
  },
);

interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

/**
 * Lencana status (design/ui.css `.badge`). Warna tidak pernah satu-satunya pembawa makna:
 * selalu ada teks. Untuk kategori skrining pakai <CategoryBadge>.
 */
export function Badge({ tone, dot, className, ...rest }: BadgeProps) {
  return <span {...rest} className={cn(badgeVariants({ tone, dot }), className)} />;
}
