import { useId, type ComponentProps, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils/cn';

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'aria-invalid'> {
  /** Teks di samping kotak; boleh berisi tautan (mis. kebijakan privasi). */
  label: ReactNode;
  error?: string;
}

/**
 * Kotak centang native (aksesibel bawaan: fokus, spasi, pembaca layar) dengan warna aksen Mindra.
 * Seluruh baris adalah area klik ≥ 44px. Tidak memakai kotak buatan yang menyembunyikan <input>.
 */
export function Checkbox({ label, error, id, className, ...rest }: CheckboxProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const errorId = `${controlId}-error`;

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={controlId}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-sm text-fg-2"
      >
        <input
          {...rest}
          id={controlId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn('mt-0.5 size-5 shrink-0 cursor-pointer accent-biru-600', className)}
        />
        <span>{label}</span>
      </label>
      <div id={errorId} aria-live="polite" className="empty:-mt-1.5">
        {error ? (
          <p className="flex items-start gap-1.5 text-sm font-medium text-danger-700">
            <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
