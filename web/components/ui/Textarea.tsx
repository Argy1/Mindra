import type { ComponentProps } from 'react';
import { controlClasses, Field, useFieldIds, type FieldOptions } from '@/components/ui/Field';
import { cn } from '@/lib/utils/cn';

interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'aria-invalid'>, FieldOptions {
  wrapperClassName?: string;
}

/** Kolom isian banyak baris, minimal 112px (design/ui.css `.textarea`). */
export function Textarea({
  label,
  hideLabel,
  optional,
  helper,
  error,
  id,
  className,
  wrapperClassName,
  'aria-describedby': extraDescribedBy,
  ...rest
}: TextareaProps) {
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
      <textarea
        {...rest}
        id={ids.controlId}
        aria-invalid={ids.invalid || undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses, 'min-h-28 resize-y py-3', className)}
      />
    </Field>
  );
}
