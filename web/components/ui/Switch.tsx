'use client';

import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

interface SwitchProps extends Omit<
  ComponentProps<'button'>,
  'role' | 'aria-checked' | 'aria-label' | 'onChange'
> {
  /**
   * Wajib. Sebut orang dan jenis datanya, mis. "Hasil skrining untuk Rina Sari",
   * supaya pengguna pembaca layar tahu persis apa yang dinyalakan.
   */
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** Saklar nyala/mati (design/ui.css `.switch`) — `role="switch"` + `aria-checked`. */
export function Switch({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  className,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isOn = isControlled ? checked : internal;

  return (
    <button
      {...rest}
      type={type}
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isControlled) setInternal(!isOn);
        onCheckedChange?.(!isOn);
      }}
      className={cn(
        // Latar mati memakai --border-control (3,5:1 vs putih) dan latar nyala sage-600:
        // sage-500 dari desain hanya 2,97:1 terhadap kanvas (WCAG 1.4.11 butuh 3:1).
        'group touch-target relative h-7 w-12 shrink-0 cursor-pointer rounded-pill bg-line-control',
        'transition-colors duration-(--dur-base) aria-checked:bg-sage-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-[3px] left-[3px] size-[22px] rounded-full bg-white shadow-xs',
          'transition-transform duration-(--dur-base) ease-out-soft group-aria-checked:translate-x-5',
        )}
      />
    </button>
  );
}
