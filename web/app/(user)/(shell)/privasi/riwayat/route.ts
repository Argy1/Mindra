import { NextResponse } from 'next/server';
import { getSessionState } from '@/lib/auth/session';
import { accessLogToCsv } from '@/lib/domain/privacy/access-log';
import { getAccessLog } from '@/lib/server/privacy';

// Berisi data per pengguna: tidak boleh diprerender atau disimpan cache perantara.
export const dynamic = 'force-dynamic';

/** Jumlah baris maksimum yang diunduh; sama dengan batas atas RPC `my_access_log`. */
const MAX_ROWS = 500;

/**
 * Unduh riwayat akses sebagai CSV. Alamatnya sengaja TANPA ekstensi `.csv`: matcher middleware
 * melewati path bertitik, sehingga peran dan sesi tidak diperiksa di sana. Penjaga peran di bawah
 * mengulang pemeriksaan itu, dan RPC `my_access_log` hanya mengembalikan baris milik pemanggil.
 */
export async function GET() {
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'user') {
    return new NextResponse('Masuk dulu untuk mengunduh riwayat aksesmu.', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const entries = await getAccessLog(MAX_ROWS);
    return new NextResponse(accessLogToCsv(entries), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="riwayat-akses-mindra.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Riwayat akses belum bisa diunduh. Coba lagi sebentar lagi.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
