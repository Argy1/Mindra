import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';

/** Folder migrasi proyek Supabase (milik aplikasi Flutter + migrasi web), induk dari web/. */
export const MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'supabase',
  'migrations',
);
export const WEB_MIGRATION = '20261014000000_web_ecosystem.sql';
/** Pengerasan undangan pendamping (F1/F3/F4/F8); dimuat setelah migrasi web. */
export const HARDENING_MIGRATION = '20261014000100_caregiver_invite_hardening.sql';
/** Integritas hasil asesmen (F6): total_score dan category dihitung ulang server dari jawaban. */
export const INTEGRITY_MIGRATION = '20261014000200_assessment_integrity.sql';
/** Fase 2: MFA di database, RPC psikolog/pendamping/riwayat akses, catatan sesi, persetujuan SATUSEHAT. */
export const CARE_MIGRATION = '20261014000300_care_ecosystem.sql';
export const hasCareMigration = existsSync(path.join(MIGRATIONS_DIR, CARE_MIGRATION));
/** Menghapus empat policy psikolog lama yang tidak berlaku tetapi berbahaya bila suatu hari berlaku (sisa F5). */
export const LEGACY_CLEANUP_MIGRATION = '20261014000400_drop_inert_psychologist_policies.sql';
export const hasLegacyCleanupMigration = existsSync(
  path.join(MIGRATIONS_DIR, LEGACY_CLEANUP_MIGRATION),
);
/** Fase 4: MFA admin faskes di database, penjaga bentrok jadwal, fungsi pemesanan konsultasi. */
export const BOOKING_MIGRATION = '20261014000500_facility_mfa_and_booking.sql';
export const hasBookingMigration = existsSync(path.join(MIGRATIONS_DIR, BOOKING_MIGRATION));
export const REGION_ADMIN_MIGRATION = '20261014000600_region_optin_admin_review.sql';
export const hasRegionAdminMigration = existsSync(
  path.join(MIGRATIONS_DIR, REGION_ADMIN_MIGRATION),
);
/** Gelombang 3: ringkasan penggunaan Teman cerita (tanpa isi percakapan) untuk psikolog yang diizinkan. */
export const COMPANION_MIGRATION = '20261014000700_companion_activity_summary.sql';
export const hasCompanionMigration = existsSync(path.join(MIGRATIONS_DIR, COMPANION_MIGRATION));
/** Temuan #13: nomor STR diminta saat calon psikolog mendaftar (kolom + handle_new_user + antrean admin dengan STR). */
export const STR_SIGNUP_MIGRATION = '20261016000000_psychologist_str_at_signup.sql';
export const hasStrSignupMigration = existsSync(path.join(MIGRATIONS_DIR, STR_SIGNUP_MIGRATION));
export const hasMigrations = existsSync(path.join(MIGRATIONS_DIR, WEB_MIGRATION));
export const hasHardeningMigration = existsSync(path.join(MIGRATIONS_DIR, HARDENING_MIGRATION));
export const hasIntegrityMigration = existsSync(path.join(MIGRATIONS_DIR, INTEGRITY_MIGRATION));

const STUB = readFileSync(path.join(import.meta.dirname, 'supabase-stub.sql'), 'utf8');

export function readMigration(file: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
}

/** Migrasi dasar (Flutter) berurutan, tanpa migrasi web. */
export function baseMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && file < WEB_MIGRATION)
    .sort();
}

/**
 * PGlite tidak menyertakan uuid-ossp/pgcrypto secara bawaan; skema tidak memakai fungsinya
 * (gen_random_uuid sudah bawaan inti Postgres), jadi baris CREATE EXTENSION dilewati. Satu-satunya yang
 * dibutuhkan adalah btree_gist (constraint EXCLUDE jadwal, migrasi 000500); ia dimuat lewat opsi PGlite
 * di `createBaseDatabase`, bukan lewat pernyataan di migrasi.
 */
function withoutExtensions(sql: string): string {
  return sql.replace(/^\s*create extension if not exists .*;\s*$/gim, '-- (dilewati di PGlite)');
}

/** Database baru: stub Supabase + migrasi Flutter. Migrasi web dimuat terpisah (applyWeb). */
export async function createBaseDatabase(): Promise<PGlite> {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec('create extension if not exists btree_gist;');
  await db.exec(STUB);
  for (const file of baseMigrationFiles()) {
    await db.exec(withoutExtensions(readMigration(file)));
  }
  return db;
}

export async function applyWebMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(WEB_MIGRATION)));
}

export async function applyHardeningMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(HARDENING_MIGRATION)));
}

export async function applyIntegrityMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(INTEGRITY_MIGRATION)));
}

export async function applyCareMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(CARE_MIGRATION)));
}

export async function applyLegacyCleanupMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(LEGACY_CLEANUP_MIGRATION)));
}

export async function applyBookingMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(BOOKING_MIGRATION)));
}

export async function applyRegionAdminMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(REGION_ADMIN_MIGRATION)));
}

export async function applyCompanionMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(COMPANION_MIGRATION)));
}

export async function applyStrSignupMigration(db: PGlite): Promise<void> {
  await db.exec(withoutExtensions(readMigration(STR_SIGNUP_MIGRATION)));
}

/** Keadaan proyek cloud: migrasi Flutter + web + pengerasan + integritas + Fase 2 + pembersihan + Fase 4 + gelombang 1 + 3. */
export async function applyAllWebMigrations(db: PGlite): Promise<void> {
  await applyWebMigration(db);
  await applyHardeningMigration(db);
  await applyIntegrityMigration(db);
  await applyCareMigration(db);
  if (hasLegacyCleanupMigration) await applyLegacyCleanupMigration(db);
  if (hasBookingMigration) await applyBookingMigration(db);
  if (hasRegionAdminMigration) await applyRegionAdminMigration(db);
  if (hasCompanionMigration) await applyCompanionMigration(db);
  if (hasStrSignupMigration) await applyStrSignupMigration(db);
}

export interface Session {
  /** auth.uid(); null = tanpa JWT (anon). */
  uid: string | null;
  role: 'anon' | 'authenticated' | 'service_role';
  /** Tingkat jaminan autentikasi (klaim JWT `aal`). Bawaan untuk pengguna: aal2 (TOTP terverifikasi). */
  aal?: 'aal1' | 'aal2';
}

export const asUser = (uid: string): Session => ({ uid, role: 'authenticated' });
/** Sesi pengguna yang HANYA memakai kata sandi (belum memverifikasi TOTP). */
export const withAal1 = (session: Session): Session => ({ ...session, aal: 'aal1' });
export const asAnon: Session = { uid: null, role: 'anon' };
export const asService: Session = { uid: null, role: 'service_role' };

export interface Query {
  <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Jalankan blok di dalam transaksi yang meniru satu permintaan PostgREST (role Postgres +
 * klaim JWT), lalu SELALU di-rollback supaya tes saling terisolasi.
 */
export async function withSession<T>(
  db: PGlite,
  session: Session,
  fn: (query: Query) => Promise<T>,
): Promise<T> {
  let result!: T;
  await db.transaction(async (tx: Transaction) => {
    await tx.query(`select set_config('request.jwt.claim.role', $1, true)`, [session.role]);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [session.uid ?? '']);
    await tx.query(`select set_config('request.jwt.claim.aal', $1, true)`, [
      session.aal ?? (session.role === 'authenticated' ? 'aal2' : ''),
    ]);
    await tx.exec(`set local role ${session.role}`);
    const query: Query = async (sql, params) => (await tx.query(sql, params)).rows as never;
    result = await fn(query);
    await tx.rollback();
  });
  return result;
}

/** Eksekusi yang HARUS gagal; mengembalikan pesan galat + kode SQLSTATE. */
export async function expectFailure(
  db: PGlite,
  session: Session,
  sql: string,
  params?: unknown[],
): Promise<{ message: string; code?: string }> {
  try {
    await withSession(db, session, (query) => query(sql, params));
  } catch (error) {
    const e = error as { message?: string; code?: string };
    return { message: e.message ?? String(error), code: e.code };
  }
  throw new Error(`Seharusnya gagal, tetapi berhasil: ${sql}`);
}
