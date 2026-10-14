import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface RadioCardProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  label: ReactNode;
  /** Keterangan kecil di bawah label. */
  description?: ReactNode;
  /** Petunjuk papan ketik di ujung kanan, mis. "1" (pertanyaan asesmen: tombol 1–4). */
  hint?: string;
}

/**
 * Pilihan radio berbentuk kartu (design/app-asesmen.html `.option`). <input type="radio"> asli
 * tetap menjadi kontrolnya (fokus, panah, spasi bawaan browser); hanya tampilannya yang diganti.
 * Kelompokkan dengan <RadioGroup>.
 */
export function RadioCard({ label, description, hint, className, ...rest }: RadioCardProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-16 cursor-pointer items-center gap-4 rounded-lg border-[1.5px] border-line-soft bg-raised px-5 py-3',
        'transition-colors duration-(--dur-fast) hover:border-biru-300',
        'has-[:checked]:border-biru-500 has-[:checked]:bg-biru-50',
        'has-[:focus-visible]:shadow-glow-biru has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-biru-500',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        className,
      )}
    >
      <input {...rest} type="radio" className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-line-control',
          "peer-checked:border-biru-500 after:size-2.5 after:rounded-full after:content-[''] peer-checked:after:bg-biru-500",
        )}
      />
      <span className="grid gap-0.5">
        <span className="font-medium text-fg-1">{label}</span>
        {description ? <span className="meta">{description}</span> : null}
      </span>
      {hint ? (
        <kbd className="ml-auto rounded-xs border border-line-soft px-1.5 py-0.5 font-mono text-xs text-fg-4">
          {hint}
        </kbd>
      ) : null}
    </label>
  );
}
