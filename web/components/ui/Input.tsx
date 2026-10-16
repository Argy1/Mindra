import type { ComponentProps, ReactNode } from 'react';
import { controlClasses, Field, useFieldIds, type FieldOptions } from '@/components/ui/Field';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends Omit<ComponentProps<'input'>, 'aria-invalid'>, FieldOptions {
  /** Kelas untuk pembungkus (bukan untuk <input>). */
  wrapperClassName?: string;
  /** Kontrol di ujung kanan kolom, mis. tombol tampilkan/sembunyikan kata sandi. */
  endAdornment?: ReactNode;
}

/** Latar sunken dan teks lebih redup untuk kolom hanya-baca; tetap bisa difokuskan dan disalin. */
const READ_ONLY_CLASSES =
  'aria-readonly:cursor-default aria-readonly:border-line-soft aria-readonly:bg-sunken aria-readonly:text-fg-2';

/** Kolom isian satu baris, tinggi 48px (design/ui.css `.input`). */
export function Input({
  label,
  hideLabel,
  optional,
  helper,
  error,
  id,
  className,
  wrapperClassName,
  endAdornment,
  'aria-describedby': extraDescribedBy,
  ...rest
}: InputProps) {
  const ids = useFieldIds(id, helper, error);
  const describedBy = [ids.describedBy, extraDescribedBy].filter(Boolean).join(' ') || undefined;
  // Kolom hanya-baca (mis. email di profil) harus tampak berbeda dari kolom yang bisa diedit: latar redup lewat
  // varian `aria-readonly`, dan atributnya juga dikirim eksplisit supaya pembaca layar menyebutnya.
  const ariaReadOnly = rest.readOnly ? true : undefined;

  return (
    <Field
      ids={ids}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      helper={helper}
      error={error}
      className={wrapperClassName}
    >
      {endAdornment ? (
        <div className="relative">
          <input
            {...rest}
            id={ids.controlId}
            aria-invalid={ids.invalid || undefined}
            aria-readonly={ariaReadOnly}
            aria-describedby={describedBy}
            className={cn(controlClasses, READ_ONLY_CLASSES, 'min-h-12 pr-14', className)}
          />
          <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>
        </div>
      ) : (
        <input
          {...rest}
          id={ids.controlId}
          aria-invalid={ids.invalid || undefined}
          aria-readonly={ariaReadOnly}
          aria-describedby={describedBy}
          className={cn(controlClasses, READ_ONLY_CLASSES, 'min-h-12', className)}
        />
      )}
    </Field>
  );
}
