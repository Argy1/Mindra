'use client';

import { useState } from 'react';

/** Tombol salin kecil di pojok blok kode. Bila clipboard ditolak, teks tetap bisa dipilih manual. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="touch-target absolute top-2 right-2 rounded-pill bg-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-50 hover:bg-neutral-600"
    >
      {copied ? 'Tersalin' : 'Salin'}
      <span className="sr-only"> {label}</span>
      <span role="status" className="sr-only">
        {copied ? 'Tersalin ke clipboard.' : ''}
      </span>
    </button>
  );
}
