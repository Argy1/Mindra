'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/Switch';

/** Saklar izin di halaman privasi: label menyebut orang + jenis data. */
export function SwitchDemo() {
  const [skrining, setSkrining] = useState(true);

  return (
    <ul className="grid max-w-md gap-2">
      <li className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2.5 text-sm text-fg-2">
        Hasil skrining
        <Switch
          label="Hasil skrining untuk Rina Sari"
          checked={skrining}
          onCheckedChange={setSkrining}
        />
      </li>
      <li className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2.5 text-sm text-fg-2">
        Mood harian
        <Switch label="Mood harian untuk Ibu" defaultChecked={false} />
      </li>
      <li className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2.5 text-sm text-fg-4">
        Dinonaktifkan
        <Switch label="Contoh saklar nonaktif" disabled />
      </li>
    </ul>
  );
}
