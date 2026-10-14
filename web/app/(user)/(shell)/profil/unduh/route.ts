import { NextResponse } from 'next/server';
import { getSessionState } from '@/lib/auth/session';
import { exportFileName } from '@/lib/domain/profile/export';
import { collectUserExport } from '@/lib/server/profile-export';

// Berisi data per pengguna: tidak boleh diprerender atau disimpan cache perantara.
export const dynamic = 'force-dynamic';

/**
 * Unduh salinan data sendiri sebagai JSON. Alamatnya sengaja TANPA ekstensi `.json`: matcher middleware melewati
 * path bertitik, sehingga peran dan sesi tidak diperiksa di sana. Penjaga di bawah mengulang pemeriksaan itu, dan
 * setiap kueri disaring ke pemilik lewat RLS dan penyaring eksplisit.
 */
export async function GET() {
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'user') {
    return new NextResponse('Masuk dulu untuk mengunduh datamu.', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const document = await collectUserExport(session.profile.id);
    return new NextResponse(`${JSON.stringify(document, null, 2)}\n`, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName(new Date())}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Datamu belum bisa diunduh. Coba lagi sebentar lagi.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
