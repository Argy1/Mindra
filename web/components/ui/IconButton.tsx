import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'aria-label'> {
  /** Wajib: tombol ikon tidak punya teks, jadi namanya harus datang dari sini. */
  label: string;
  tone?: 'neutral' | 'danger';
}

/** Tombol ikon 44×44px (design/ui.css `.icon-btn`). Taruh ikon Phosphor sebagai children. */
export function IconButton({
  label,
  tone = 'neutral',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill',
        'transition-colors duration-(--dur-fast) disabled:pointer-events-none disabled:opacity-50',
        '[&>svg]:size-[1.375rem]',
        tone === 'neutral' && 'text-fg-3 hover:bg-sunken hover:text-fg-1',
        tone === 'danger' && 'text-danger-700 hover:bg-danger-50',
        className,
      )}
    >
      {children}
    </button>
  );
}
