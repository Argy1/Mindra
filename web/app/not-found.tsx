import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Halaman tidak ditemukan' };

/** 404 berbahasa Indonesia, hangat, dengan satu jalan keluar yang jelas. */
export default function NotFound() {
  return (
    <main id="isi" className="mx-auto grid min-h-dvh max-w-xl content-center gap-4 px-gutter py-16">
      <p className="meta">Kode 404</p>
      <h1 className="display-3">Halaman ini tidak kami temukan.</h1>
      <p className="lead">
        Alamatnya mungkin salah ketik, atau halamannya sudah dipindahkan. Kamu bisa kembali ke
        beranda dan mulai dari sana.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button href="/">Ke beranda</Button>
        <Button variant="ghost" href="/masuk">
          Masuk
        </Button>
      </div>
    </main>
  );
}
