import { useId, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils/cn';

interface RadioGroupProps {
  /** Wajib: pertanyaan/judul kelompok, dibacakan pembaca layar sebelum tiap pilihan. */
  legend: string;
  children: ReactNode;
  error?: string;
  className?: string;
}

/** Kelompok pilihan: <fieldset> + <legend> asli, dengan galat yang terhubung lewat aria-describedby. */
export function RadioGroup({ legend, children, error, className }: RadioGroupProps) {
  const errorId = useId();
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      className={cn('grid gap-3 border-0 p-0', className)}
    >
      <legend className="mb-1 text-sm font-semibold text-fg-1">{legend}</legend>
      {children}
      <div id={errorId} aria-live="polite" className="empty:hidden">
        {error ? (
          <p className="flex items-start gap-1.5 text-sm font-medium text-danger-700">
            <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
