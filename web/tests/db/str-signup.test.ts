// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyAllWebMigrations,
  asAnon,
  asUser,
  createBaseDatabase,
  expectFailure,
  hasMigrations,
  hasStrSignupMigration,
  withAal1,
  withSession,
} from './harness';

/**
 * Migrasi 20261016000000 (temuan #13): nomor STR diisi calon psikolog saat mendaftar, disalin `handle_new_user`
 * dari metadata signup, dan dibaca admin lewat antrean baru. Dijalankan di Postgres sungguhan (PGlite).
 */
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const APPLICANT = uuid(0x3001);
const APPLICANT_NO_STR = uuid(0x3002);
const REGULAR = uuid(0x3003);
const SNEAKY = uuid(0x3004);
const LONG_STR = uuid(0x3005);
const ADMIN = uuid(0x3100);
const PLAIN = uuid(0x3101);

const skip = !hasMigrations || !hasStrSignupMigration;

describe.skipIf(skip)('migrasi psychologist_str_at_signup', () => {
  let db: PGlite;
  const admin = asUser(ADMIN);

  async function signUp(id: string, email: string, metadata: Record<string, unknown>) {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
      [id, email, JSON.stringify(metadata)],
    );
  }
  const profileOf = async (id: string) =>
    (
      await db.query<{
        role: string;
        requested_role: string | null;
        requested_str_number: string | null;
        name: string;
      }>(
        `select role, requested_role, requested_str_number, name from public.profiles where id = $1`,
        [id],
      )
    ).rows[0];

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyAllWebMigrations(db);
    await signUp(ADMIN, 'admin-str@t.test', { full_name: 'Admin' });
    await signUp(PLAIN, 'biasa-str@t.test', { full_name: 'Biasa' });
    await db.query(`update public.profiles set role = 'admin' where id = $1`, [ADMIN]);
    await signUp(APPLICANT, 'str1@t.test', {
      full_name: 'Calon Ber-STR',
      requested_role: 'psychologist',
      requested_str: '  STR-1234 5678  ',
    });
    await signUp(APPLICANT_NO_STR, 'str2@t.test', {
      full_name: 'Calon Tanpa STR',
      requested_role: 'psychologist',
    });
    await signUp(REGULAR, 'str3@t.test', {
      full_name: 'Pengguna Biasa',
      requested_str: 'STR-DISUSUPKAN',
    });
    await signUp(SNEAKY, 'str4@t.test', {
      full_name: 'Calon Nakal',
      requested_role: 'admin',
      requested_str: 'STR-9999',
    });
    await signUp(LONG_STR, 'str5@t.test', {
      full_name: 'Calon Panjang',
      requested_role: 'psychologist',
      requested_str: 'X'.repeat(200),
    });
  }, 120_000);

  afterAll(async () => {
    await db.close();
  });

  describe('setelah semua migrasi', () => {
    it('STR dari metadata disimpan terpangkas spasinya bila pemohon meminta peran psikolog', async () => {
      expect(await profileOf(APPLICANT)).toMatchObject({
        name: 'Calon Ber-STR',
        role: 'user',
        requested_role: 'psychologist',
        requested_str_number: 'STR-1234 5678',
      });
    });

    it('tanpa STR di metadata: kolom null, permintaan peran tetap tercatat (pendaftar lama)', async () => {
      expect(await profileOf(APPLICANT_NO_STR)).toMatchObject({
        requested_role: 'psychologist',
        requested_str_number: null,
      });
    });

    it('pendaftar biasa tidak bisa menitipkan STR lewat metadata (tanpa permintaan peran, kolom tetap null)', async () => {
      expect(await profileOf(REGULAR)).toMatchObject({
        requested_role: null,
        requested_str_number: null,
      });
    });

    it('peran dari metadata tetap tidak pernah dipercaya; permintaan selain "psychologist" diabaikan seluruhnya', async () => {
      expect(await profileOf(SNEAKY)).toMatchObject({
        role: 'user',
        requested_role: null,
        requested_str_number: null,
      });
    });

    it('STR yang terlalu panjang dipotong 60 karakter (tidak menggagalkan pendaftaran)', async () => {
      const profile = await profileOf(LONG_STR);
      expect(profile?.requested_str_number).toHaveLength(60);
    });

    it('pendaftaran dengan metadata lama (hanya full_name) tetap berjalan seperti sebelumnya', async () => {
      const legacy = uuid(0x3010);
      await signUp(legacy, 'lama@t.test', { full_name: 'Pengguna Lama' });
      expect(await profileOf(legacy)).toMatchObject({
        name: 'Pengguna Lama',
        role: 'user',
        requested_role: null,
        requested_str_number: null,
      });
      const bare = uuid(0x3011);
      await signUp(bare, 'tanpa.nama@t.test', {});
      expect((await profileOf(bare))?.name).toBe('tanpa.nama');
    });

    it('antrean admin memuat klaim STR; antrean lama tetap ada dan tidak berubah bentuknya', async () => {
      const rows = await withSession(db, admin, (q) =>
        q<{ id: string; str_number: string | null }>(
          'select id, str_number from public.admin_pending_psychologist_applications()',
        ),
      );
      const byId = new Map(rows.map((row) => [row.id, row.str_number]));
      expect(byId.get(APPLICANT)).toBe('STR-1234 5678');
      expect(byId.get(APPLICANT_NO_STR)).toBeNull();
      expect(byId.has(REGULAR)).toBe(false);
      expect(byId.has(SNEAKY)).toBe(false);

      const legacy = await withSession(db, admin, (q) =>
        q<Record<string, unknown>>('select * from public.admin_pending_psychologists()'),
      );
      expect(Object.keys(legacy[0] ?? {}).sort()).toEqual(['created_at', 'email', 'id', 'name']);
    });

    it('hanya admin dengan sesi aal2 yang boleh membaca antrean ber-STR (42501)', async () => {
      for (const session of [asUser(PLAIN), asUser(APPLICANT), withAal1(admin), asAnon]) {
        const failure = await expectFailure(
          db,
          session,
          'select * from public.admin_pending_psychologist_applications()',
        );
        expect(failure.code).toBe('42501');
      }
    });

    it('fungsi antrean tidak menyentuh data kesehatan dan tidak bisa dipanggil anon', async () => {
      const [fn] = (
        await db.query<{ src: string }>(
          `select pg_get_functiondef(p.oid) as src from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'admin_pending_psychologist_applications'`,
        )
      ).rows;
      expect(fn?.src).toContain("SET search_path TO ''");
      for (const table of ['assessments', 'mood_entries', 'sleep_entries', 'ai_conversations']) {
        expect(fn?.src, table).not.toContain(table);
      }
    });

    it('handle_new_user tetap security definer dengan search_path kosong dan tidak bisa dipanggil pengguna', async () => {
      const [fn] = (
        await db.query<{ def: string }>(
          `select pg_get_functiondef(p.oid) as def from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'handle_new_user'`,
        )
      ).rows;
      expect(fn?.def).toContain('SECURITY DEFINER');
      expect(fn?.def).toContain("search_path TO ''");
      const failure = await expectFailure(db, asUser(PLAIN), 'select public.handle_new_user()');
      expect(['42501', '0A000', '42883']).toContain(failure.code);
    });

    it('batas panjang kolom ditegakkan di database juga (1 sampai 60)', async () => {
      const tooLong = await db
        .query(`update public.profiles set requested_str_number = $1 where id = $2`, [
          'Y'.repeat(61),
          APPLICANT,
        ])
        .then(() => null)
        .catch((error: { code?: string }) => error.code);
      expect(tooLong).toBe('23514');
      const empty = await db
        .query(`update public.profiles set requested_str_number = '' where id = $1`, [APPLICANT])
        .then(() => null)
        .catch((error: { code?: string }) => error.code);
      expect(empty).toBe('23514');
    });
  });
});
