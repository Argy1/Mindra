import { useId, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react/ssr';
import { cn } from '@/lib/utils/cn';

/** Props yang dimiliki bersama oleh Input, Textarea, dan Select. */
export interface FieldOptions {
  /** Wajib. Setiap kolom isian harus punya label (aksesibilitas). */
  label: string;
  /** Sembunyikan label secara visual tetapi tetap terbaca pembaca layar (mis. kolom cari). */
  hideLabel?: boolean;
  /** Tandai kolom yang boleh dikosongkan; menampilkan "(opsional)" di label. */
  optional?: boolean;
  helper?: string;
  /** Pesan galat ramah: jelaskan apa yang terjadi dan cara memperbaikinya. */
  error?: string;
}

interface FieldIds {
  controlId: string;
  helperId: string | undefined;
  errorId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

/** Hubungkan label, bantuan, dan galat ke kontrol lewat id yang stabil. */
export function useFieldIds(
  id: string | undefined,
  helper: string | undefined,
  error: string | undefined,
): FieldIds {
  const generated = useId();
  const controlId = id ?? generated;
  const helperId = helper ? `${controlId}-helper` : undefined;
  const errorId = `${controlId}-error`;
  const describedBy = [error ? errorId : undefined, helperId].filter(Boolean).join(' ');
  return {
    controlId,
    helperId,
    errorId,
    describedBy: describedBy || undefined,
    invalid: Boolean(error),
  };
}

interface FieldProps extends FieldOptions {
  ids: FieldIds;
  className?: string;
  children: ReactNode;
}

/** Bungkus label + kontrol + bantuan + galat (design/ui.css `.field`). */
export function Field({
  ids,
  label,
  hideLabel,
  optional,
  helper,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label
        htmlFor={ids.controlId}
        className={cn('text-sm font-semibold text-fg-1', hideLabel && 'sr-only')}
      >
        {label}
        {optional ? <span className="ml-1.5 font-normal text-fg-4">(opsional)</span> : null}
      </label>
      {children}
      {helper ? (
        <p id={ids.helperId} className="meta">
          {helper}
        </p>
      ) : null}
      {/* Wadah galat selalu ada di DOM agar perubahan isinya diumumkan pembaca layar. */}
      {/* `empty:-mt-1.5` membatalkan celah grid saat wadah kosong (tanpa menghapusnya dari DOM). */}
      <div id={ids.errorId} aria-live="polite" className="empty:-mt-1.5">
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

/** Kelas dasar kontrol isian. Border 3:1 (WCAG 1.4.11), bukan border-soft dari desain. */
export const controlClasses = cn(
  'w-full rounded-md border-[1.5px] border-line-control bg-raised px-4 text-fg-1',
  'transition-[border-color,box-shadow] duration-(--dur-fast)',
  'placeholder:text-fg-4 focus:border-biru-500 focus-visible:shadow-glow-biru',
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 aria-invalid:border-danger-500',
);
