import 'server-only';
import {
  buildExport,
  EXPORT_ROW_LIMIT,
  EXPORT_SECTIONS,
  type ExportDocument,
  type SectionResult,
} from '@/lib/domain/profile/export';
import { createClient } from '@/lib/supabase/server';

/**
 * Mengumpulkan salinan data milik pemanggil. Semua pembacaan memakai SESI pengguna (RLS menjaga) dengan
 * penyaring pemilik eksplisit di setiap kueri; tidak ada klien service role. Satu bagian yang gagal dibaca
 * dilewati dan disebut di dokumen, tidak menggagalkan seluruh unduhan.
 */
export async function collectUserExport(userId: string): Promise<ExportDocument> {
  const supabase = await createClient();

  const sections: Record<string, SectionResult> = {};
  await Promise.all(
    EXPORT_SECTIONS.map(async (section) => {
      try {
        // Nama tabel dan kolom berasal dari daftar tetap EXPORT_SECTIONS (diuji terhadap tipe database);
        // pemeran tipe di bawah hanya menyiasati ketatnya tipe klien untuk tabel yang dipilih saat berjalan.
        let query = supabase
          .from(section.table as 'assessments')
          .select('*')
          .eq(section.ownerColumn as 'user_id', userId);
        if (section.orderBy)
          query = query.order(section.orderBy as 'created_at', { ascending: false });
        const { data, error } = await query.limit(EXPORT_ROW_LIMIT);
        sections[section.key] = error
          ? { rows: [], error: true }
          : { rows: (data ?? []) as unknown as Record<string, unknown>[] };
      } catch {
        sections[section.key] = { rows: [], error: true };
      }
    }),
  );

  let accessLog: SectionResult;
  try {
    const { data, error } = await supabase.rpc('my_access_log', { p_limit: 500 });
    accessLog = error
      ? { rows: [], error: true }
      : { rows: (data ?? []) as Record<string, unknown>[] };
  } catch {
    accessLog = { rows: [], error: true };
  }

  return buildExport({ userId, generatedAt: new Date(), sections, accessLog });
}
