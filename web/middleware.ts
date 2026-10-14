import { NextResponse, type NextRequest } from 'next/server';
import { decideAccess } from '@/lib/auth/route-access';
import { redirectWithCookies, updateSession } from '@/lib/supabase/middleware';
import { isDevPagesEnabled } from '@/lib/utils/dev-pages';

/**
 * Pintu masuk semua permintaan halaman. Tiga tugas, berurutan:
 *
 *  1. Gerbang `/dev/*` (katalog komponen): 404 di produksi kecuali ENABLE_DEV_PAGES=true. Harus di
 *     middleware, bukan hanya notFound() di layout: Next tetap me-render segmen `page` secara
 *     paralel saat layout melempar notFound(), sehingga respons 404 masih membawa payload halaman
 *     (terbukti di build produksi). Menulis ulang ke rute yang tidak ada berarti halaman TIDAK
 *     PERNAH dijalankan.
 *  2. Menyegarkan sesi Supabase (cookie) dan membaca identitas dari klaim JWT yang diverifikasi.
 *  3. Guard rute cepat per peran (lib/auth/route-access.ts). Ini LAPISAN PERTAMA: ia membaca peran
 *     dari klaim JWT (bisa basi sampai token diperbarui). Yang mengamankan data adalah RLS, dan
 *     layout portal memeriksa ulang peran dari tabel profiles (requireRole).
 *
 * `/api/*` tidak lewat sini: route handler memverifikasi Bearer/API key sendiri.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/dev' || pathname.startsWith('/dev/')) {
    if (isDevPagesEnabled()) return NextResponse.next();
    return NextResponse.rewrite(new URL('/_dev-dinonaktifkan', request.url), { status: 404 });
  }

  const { response, session } = await updateSession(request);

  const decision = decideAccess({
    pathname,
    fullPath: pathname + search,
    signedIn: session !== null,
    role: session?.role,
  });

  if (decision.kind === 'redirect') return redirectWithCookies(request, decision.to, response);
  return response;
}

export const config = {
  // Lewati aset statis, berkas berekstensi, dan seluruh /api.
  matcher: ['/((?!api|_next/static|_next/image|assets|.*\\..*).*)'],
};
