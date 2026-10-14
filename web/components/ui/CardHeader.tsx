import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface CardHeaderProps {
  title: ReactNode;
  /** `id` judul, untuk `aria-labelledby` pada <Card as="section">. */
  titleId?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** Slot kanan: tautan "Atur izin", segmented control, keterangan meta, dll. */
  action?: ReactNode;
  className?: string;
}

/** Baris judul kartu (design/ui.css `.card__head`). */
export function CardHeader({
  title,
  titleId,
  headingLevel: Heading = 'h2',
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3 max-sm:flex-wrap', className)}>
      <Heading id={titleId} className="flex items-center gap-2 h3">
        {title}
      </Heading>
      {action}
    </div>
  );
}
