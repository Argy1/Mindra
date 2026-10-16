'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { hasAuthCookie } from '@/lib/auth/session-hint';

const subscribe = () => () => {};
const readCookie = () => hasAuthCookie(document.cookie);
const onServer = () => false;

/**
 * Tombol di kanan header halaman publik. Halaman publik dibuat statis (tanpa membaca sesi di server), jadi
 * pengunjung yang sudah masuk, mis. yang membuka dokumentasi API dari portal, sempat melihat "Masuk" dan
 * "Daftar gratis". Setelah hidrasi, bila ada cookie sesi, diganti "Ke dasbor". `/masuk` untuk pengguna yang
 * sudah masuk dialihkan middleware ke beranda perannya, jadi satu tujuan itu benar untuk semua peran.
 */
export function MarketingAuthActions() {
  const signedIn = useSyncExternalStore(subscribe, readCookie, onServer);

  if (signedIn) {
    return (
      <Button href="/masuk" size="sm">
        Ke dasbor
      </Button>
    );
  }
  return (
    <>
      <Button href="/masuk" variant="ghost" size="sm">
        Masuk
      </Button>
      <Button href="/daftar" size="sm">
        Daftar gratis
      </Button>
    </>
  );
}
