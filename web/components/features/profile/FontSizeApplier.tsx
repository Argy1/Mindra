'use client';

import { useEffect } from 'react';
import type { FontSize } from '@/lib/validation/profile';

/**
 * Menerapkan preferensi ukuran teks ke <html> (`data-font-size`, dibaca CSS di app/globals.css). Ukuran dasar
 * "biasa" tidak memasang atribut sama sekali. Berupa efek klien karena <html> dimiliki layout akar yang statis
 * (halaman marketing tetap di CDN); akibatnya ukuran baru berlaku sesaat setelah halaman tampil.
 */
export function applyFontSize(size: FontSize): void {
  const root = document.documentElement;
  if (size === 'normal') delete root.dataset.fontSize;
  else root.dataset.fontSize = size;
}

export function FontSizeApplier({ size }: { size: FontSize }) {
  useEffect(() => {
    applyFontSize(size);
    // Keluar dari portal (mis. ke halaman marketing): kembalikan ke ukuran dasar.
    return () => applyFontSize('normal');
  }, [size]);
  return null;
}
