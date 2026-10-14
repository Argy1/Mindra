'use client';

import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';

const FILTERS = ['Semua', 'Skor memburuk', 'Belum check-in 3 hari'] as const;

/** Chip filter: satu aktif pada satu waktu (`aria-pressed`). */
export function ChipDemo() {
  const [active, setActive] = useState<(typeof FILTERS)[number]>('Semua');

  return (
    <div role="group" aria-label="Filter klien" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Chip key={filter} pressed={active === filter} onClick={() => setActive(filter)}>
          {filter}
        </Chip>
      ))}
    </div>
  );
}
