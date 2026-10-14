import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  /** Ikon Phosphor (disembunyikan dari pembaca layar). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Satu ajakan bertindak, mis. <Button>Mulai check-in</Button>. */
  action?: ReactNode;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * Keadaan kosong = ajakan bertindak, bukan jalan buntu (docs/DESIGN.md).
 * Contoh: "Belum ada catatan minggu ini. Mulai dengan satu check-in."
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel: Heading = 'h3',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-medium px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-sage-50 text-sage-700 [&>svg]:size-7"
        >
          {icon}
        </span>
      ) : null}
      <Heading className="h3">{title}</Heading>
      {description ? <p className="max-w-[40ch] body-m">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
