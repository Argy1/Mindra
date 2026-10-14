import { NextResponse } from 'next/server';
import { currentMfaDecision } from '@/lib/auth/mfa-server';
import { getSessionState } from '@/lib/auth/session';
import { fileSlug, reportToCsv } from '@/lib/domain/faskes/report';
import { FaskesDataError, getReportPage } from '@/lib/server/faskes-dashboard';

// Berisi data per akun: tidak boleh diprerender atau disimpan cache perantara.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * Unduh laporan bulanan sebagai CSV. Isinya hanya gabungan anonim dari `facility_aggregate()`: berkas yang
 * sama persis dengan tabel di halaman. Alamatnya sengaja TANPA ekstensi `.csv`: matcher middleware melewati
 * path bertitik, sehingga peran dan sesi tidak diperiksa di sana. Penjaga peran dan MFA di bawah mengulang
 * pemeriksaan itu (Route Handler tidak melewati gerbang halaman), dan database menolak sesi aal1.
 */
export async function GET(request: Request) {
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'facility_admin') {
    return new NextResponse('Masuk sebagai admin faskes untuk mengunduh laporan.', {
      status: 401,
      headers: NO_STORE,
    });
  }
  if ((await currentMfaDecision('facility_admin')) !== 'ok') {
    return new NextResponse('Selesaikan verifikasi dua langkah dulu untuk mengunduh laporan.', {
      status: 403,
      headers: NO_STORE,
    });
  }

  const url = new URL(request.url);
  try {
    const page = await getReportPage(session.profile.id, {
      bulan: url.searchParams.get('bulan') ?? undefined,
      faskes: url.searchParams.get('faskes') ?? undefined,
    });
    if (!page) {
      return new NextResponse('Akunmu belum terhubung ke faskes.', {
        status: 404,
        headers: NO_STORE,
      });
    }
    const filename = `laporan-mindra-${fileSlug(page.facility.name)}-${page.month}.csv`;
    return new NextResponse(reportToCsv(page.rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        ...NO_STORE,
      },
    });
  } catch (error) {
    if (error instanceof FaskesDataError) {
      return new NextResponse('Laporan belum bisa dibuat. Coba lagi sebentar lagi.', {
        status: 500,
        headers: NO_STORE,
      });
    }
    throw error;
  }
}
