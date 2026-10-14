import type { ComponentProps } from 'react';
import { CaretDown } from '@phosphor-icons/react/ssr';
import { controlClasses, Field, useFieldIds, type FieldOptions } from '@/components/ui/Field';
import { cn } from '@/lib/utils/cn';

interface SelectProps extends Omit<ComponentProps<'select'>, 'aria-invalid'>, FieldOptions {
  wrapperClassName?: string;
}

/**
 * Pilihan dropdown. Memakai <select> bawaan browser (aksesibel di semua perangkat, termasuk
 * pemilih native di ponsel); hanya tampilannya yang diseragamkan. Isi dengan <option>.
 */
export function Select({
  label,
  hideLabel,
  optional,
  helper,
  error,
  id,
  className,
  wrapperClassName,
  children,
  'aria-describedby': extraDescribedBy,
  ...rest
}: SelectProps) {
  const ids = useFieldIds(id, helper, error);
  const describedBy = [ids.describedBy, extraDescribedBy].filter(Boolean).join(' ') || undefined;

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
      <div className="relative">
        <select
          {...rest}
          id={ids.controlId}
          aria-invalid={ids.invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, 'min-h-12 cursor-pointer appearance-none pr-11', className)}
        >
          {children}
        </select>
        <CaretDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-fg-3"
        />
      </div>
    </Field>
  );
}
