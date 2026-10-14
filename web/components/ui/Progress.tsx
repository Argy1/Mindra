import { cn } from '@/lib/utils/cn';

interface ProgressProps {
  value: number;
  max: number;
  min?: number;
  /** Wajib: nama bilah, mis. "Pertanyaan 3 dari 9". */
  label: string;
  /** Teks pengganti angka untuk pembaca layar (opsional). */
  valueText?: string;
  className?: string;
}

/** Bilah progres (design/ui.css `.progress`) dengan semantik `role="progressbar"` penuh. */
export function Progress({ value, max, min = 0, label, valueText, className }: ProgressProps) {
  const range = max - min;
  const percent = range > 0 ? Math.min(100, Math.max(0, ((value - min) / range) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn('h-2 overflow-hidden rounded-pill bg-neutral-100', className)}
    >
      <span
        className="block h-full rounded-[inherit] bg-biru-500 transition-[width] duration-(--dur-base) ease-out-soft"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
