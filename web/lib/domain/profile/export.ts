/**
 * Salinan data pengguna ("Unduh data saya", hak akses dan salinan data menurut UU PDP). Fungsi murni: pembacaan
 * ke database ada di lib/server/profile-export.ts; di sini hanya daftar bagian, penyaringan kolom, dan bentuk dokumen.
 *
 * Kolom yang BUKAN data milik pengguna dibuang: rahasia sesi video (token), kode undangan yang masih bisa
 * dipakai orang lain, dan NIK terenkripsi (tidak dipakai web, dan tidak perlu keluar dari basis data).
 */

export interface ExportSection {
  /** Nama bagian di dokumen. */
  key: string;
  /** Tabel sumber. */
  table: string;
  /** Kolom pemilik: baris dibaca hanya bila kolom ini sama dengan id pengguna. */
  ownerColumn: string;
  /** Kolom yang tidak ikut diekspor. */
  drop: readonly string[];
  /** Urutan baris (kolom waktu terbaru dulu), bila ada. */
  orderBy?: string;
}

export const EXPORT_SECTIONS: readonly ExportSection[] = [
  { key: 'profil', table: 'profiles', ownerColumn: 'id', drop: ['nik_encrypted'] },
  {
    key: 'skrining',
    table: 'assessments',
    ownerColumn: 'user_id',
    drop: [],
    orderBy: 'completed_at',
  },
  { key: 'mood', table: 'mood_entries', ownerColumn: 'user_id', drop: [], orderBy: 'created_at' },
  { key: 'tidur', table: 'sleep_entries', ownerColumn: 'user_id', drop: [], orderBy: 'bedtime' },
  {
    key: 'teman_cerita',
    table: 'ai_conversations',
    ownerColumn: 'user_id',
    drop: [],
    orderBy: 'created_at',
  },
  {
    key: 'konsultasi',
    table: 'consultations',
    ownerColumn: 'user_id',
    drop: ['agora_token', 'agora_channel_name'],
    orderBy: 'scheduled_at',
  },
  { key: 'izin_psikolog', table: 'care_links', ownerColumn: 'patient_id', drop: [] },
  {
    key: 'izin_pendamping',
    table: 'caregiver_relationships',
    ownerColumn: 'patient_id',
    drop: ['invite_code'],
  },
  { key: 'kontak_darurat', table: 'emergency_contacts', ownerColumn: 'user_id', drop: [] },
  { key: 'refleksi_malam', table: 'night_reflections', ownerColumn: 'user_id', drop: [] },
  { key: 'catatan_pikiran', table: 'thought_records', ownerColumn: 'user_id', drop: [] },
  { key: 'latihan', table: 'exercise_sessions', ownerColumn: 'user_id', drop: [] },
  { key: 'jurnal_suara', table: 'voice_journals', ownerColumn: 'user_id', drop: [] },
  { key: 'peringatan_krisis', table: 'crisis_alerts', ownerColumn: 'user_id', drop: [] },
  { key: 'sinkron_satusehat', table: 'satusehat_sync_log', ownerColumn: 'user_id', drop: [] },
  { key: 'aktivitas', table: 'activity_logs', ownerColumn: 'user_id', drop: [] },
  { key: 'notifikasi', table: 'notifications_log', ownerColumn: 'user_id', drop: [] },
];

/** Batas baris per bagian. Bagian yang mencapainya ditandai terpotong di dokumen (bukan diam-diam). */
export const EXPORT_ROW_LIMIT = 5000;

export function sanitizeRows(
  section: Pick<ExportSection, 'drop'>,
  rows: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  if (section.drop.length === 0) return rows.map((row) => ({ ...row }));
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([column]) => !section.drop.includes(column))),
  );
}

export interface SectionResult {
  rows: readonly Record<string, unknown>[];
  /** Galat saat membaca bagian ini (mis. tabel tidak ada di proyek ini); bagian dilewati, bukan menggagalkan semua. */
  error?: boolean;
}

export interface AccessLogEntry {
  [column: string]: unknown;
}

export interface ExportDocument {
  _tentang: string;
  dibuat_pada: string;
  id_akun: string;
  bagian_dilewati: string[];
  bagian_terpotong: string[];
  data: Record<string, readonly Record<string, unknown>[]>;
}

export function buildExport(input: {
  userId: string;
  generatedAt: Date;
  sections: Readonly<Record<string, SectionResult>>;
  accessLog: SectionResult;
}): ExportDocument {
  const skipped: string[] = [];
  const truncated: string[] = [];
  const data: Record<string, readonly Record<string, unknown>[]> = {};

  for (const section of EXPORT_SECTIONS) {
    const result = input.sections[section.key];
    if (!result || result.error) {
      skipped.push(section.key);
      continue;
    }
    const rows = sanitizeRows(section, result.rows);
    if (rows.length >= EXPORT_ROW_LIMIT) truncated.push(section.key);
    data[section.key] = rows;
  }

  if (input.accessLog.error) skipped.push('riwayat_akses');
  else data.riwayat_akses = input.accessLog.rows;

  return {
    _tentang:
      'Salinan data akun Mindra milikmu. Berisi isi yang kamu tulis, hasil skrining, izin berbagi, dan riwayat siapa membuka datamu. ' +
      'Rekaman jurnal suara tidak ikut: berkasnya terenkripsi di perangkatmu. Data yang pernah dikirim ke pihak ketiga (mis. SATUSEHAT) tidak terjangkau.',
    dibuat_pada: input.generatedAt.toISOString(),
    id_akun: input.userId,
    bagian_dilewati: skipped,
    bagian_terpotong: truncated,
    data,
  };
}

/** Nama berkas aman (tanggal WIB). */
export function exportFileName(date: Date): string {
  const wib = new Date(date.getTime() + 7 * 3_600_000);
  return `data-mindra-${wib.toISOString().slice(0, 10)}.json`;
}
