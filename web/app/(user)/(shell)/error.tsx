'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

/**
 * Galat saat memuat halaman pengguna. Pesan sengaja umum dan tidak memuat detail galat (bisa
 * menyentuh data kesehatan). Beranda tidak boleh berpura-pura "belum ada data" saat sebenarnya gagal.
 */
export default function UserShellError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl pt-8">
      <Alert tone="error" role="alert" title="Halaman ini belum bisa dimuat.">
        <p className="mt-1.5">
          Datamu aman. Ada kendala saat mengambilnya, mungkin karena koneksi. Coba lagi sebentar
          lagi.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={reset}>Coba lagi</Button>
          <Button variant="ghost" href="/beranda">
            Ke beranda
          </Button>
        </div>
      </Alert>
    </div>
  );
}
