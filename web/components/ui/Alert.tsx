import type { ComponentProps, ReactNode } from 'react';
import { CheckCircle, Info, Lifebuoy, WarningCircle } from '@phosphor-icons/react/ssr';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const alertVariants = cva('flex items-start gap-4 rounded-lg px-6 py-5', {
  variants: {
    tone: {
      // Merah HANYA untuk krisis (docs/DESIGN.md prinsip 4).
      crisis: 'border-[1.5px] border-danger-200 bg-danger-50 text-danger-900',
      info: 'bg-biru-50 text-biru-800',
      note: 'bg-sunken text-fg-2',
      // Galat formulir/sistem (BUKAN krisis): merah lembut tanpa bingkai tebal.
      error: 'bg-danger-50 text-danger-900',
      success: 'bg-success-50 text-success-900',
    },
  },
  defaultVariants: { tone: 'note' },
});

const iconClass = {
  crisis: 'text-danger-500',
  info: 'text-biru-600',
  note: 'text-fg-3',
  error: 'text-danger-500',
  success: 'text-success-700',
} as const;

interface AlertProps
  extends Omit<ComponentProps<'div'>, 'title'>, VariantProps<typeof alertVariants> {
  title?: string;
  titleAs?: 'h2' | 'h3' | 'h4';
  /** Ganti ikon bawaan tone. */
  icon?: ReactNode;
  /** Padat: untuk catatan kecil di dalam kartu (mis. "ini skrining, bukan diagnosis"). */
  compact?: boolean;
}

/**
 * Pesan berlatar warna (design/ui.css `.alert`). Tidak ada `role` bawaan; pesan yang harus
 * diumumkan segera memakai `role="alert"` (otomatis lewat <CrisisBanner>).
 */
export function Alert({
  tone = 'note',
  title,
  titleAs: Title = 'h2',
  icon,
  compact,
  className,
  children,
  ...rest
}: AlertProps) {
  const resolvedTone = tone ?? 'note';
  const DefaultIcon = {
    crisis: Lifebuoy,
    error: WarningCircle,
    success: CheckCircle,
    info: Info,
    note: Info,
  }[resolvedTone];
  return (
    <div
      {...rest}
      className={cn(alertVariants({ tone }), compact && 'gap-3 px-[1.125rem] py-3.5', className)}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 shrink-0 [&>svg]:size-[1.625rem]',
          compact && '[&>svg]:size-5',
          iconClass[resolvedTone],
        )}
      >
        {icon ?? (
          <DefaultIcon
            weight={
              resolvedTone === 'crisis'
                ? 'duotone'
                : resolvedTone === 'error' || resolvedTone === 'success'
                  ? 'fill'
                  : 'regular'
            }
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <Title className={cn('h2', resolvedTone === 'crisis' && 'text-danger-900')}>
            {title}
          </Title>
        ) : null}
        {children}
      </div>
    </div>
  );
}
