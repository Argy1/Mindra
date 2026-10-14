import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

interface ChipProps extends Omit<ComponentProps<'button'>, 'aria-pressed'> {
  /**
   * Chip filter/pilihan: beri `pressed` (true/false) → `aria-pressed`.
   * Chip aksi biasa (mis. saran balasan) cukup tanpa `pressed`.
   */
  pressed?: boolean;
}

/** Chip pil (design/ui.css `.chip`). Tinggi tampilan 36px, area sentuh 44px. */
export function Chip({ pressed, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={pressed}
      className={cn(
        'touch-target inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill border border-line-soft',
        'bg-raised px-3.5 text-sm font-medium text-fg-2 transition-colors duration-(--dur-fast)',
        'hover:border-biru-200 aria-pressed:border-biru-300 aria-pressed:bg-biru-50 aria-pressed:text-biru-700',
        'disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-[1.125rem]',
        className,
      )}
    />
  );
}
