// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyCareMigration,
  applyHardeningMigration,
  applyIntegrityMigration,
  applyLegacyCleanupMigration,
  applyWebMigration,
  asUser,
  createBaseDatabase,
  hasCareMigration,
  hasHardeningMigration,
  hasIntegrityMigration,
  hasLegacyCleanupMigration,
  hasMigrations,
  LEGACY_CLEANUP_MIGRATION,
  readMigration,
  withAal1,
  withSession,
  type Session,
} from './harness';

/**
 * Migrasi 20261014000400: menghapus empat policy psikolog lama (sisa F5).
 *
 * Skenario yang dibuktikan: policy lama membandingkan `auth.uid()` dengan `consultations.psychologist_id`.
 * Dengan data nyata itu tidak pernah benar, tetapi BILA suatu baris `psychologists` dibuat dengan id yang
 * sama dengan akun login (mis. kesalahan operator memakai service role), policy itu membuka skrining, profil,
 * dan konsultasi pasien TANPA care_links dan TANPA MFA. Tes ini menunjukkan celahnya ada sebelum migrasi dan
 * hilang sesudahnya, sementara jalur resmi (care_links + aal2) tetap bekerja.
 */
const CONSULTATION = '00000000-0000-4000-8000-0000000000c9';

describe.skipIf(
  !hasMigrations ||
    !hasHardeningMigration ||
    !hasIntegrityMigration ||
    !hasCareMigration ||
    !hasLegacyCleanupMigration,
)('migrasi drop_inert_psychologist_policies (sisa F5)', () => {
  let db: PGlite;
  const mallory = asUser(ID.mallory);

  const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
    withSession(db, session, (q) => q<T>(sql, params));
  const count = async (session: Session, sql: string, params?: unknown[]) =>
    (await run<{ n: number }>(session, `select count(*)::int as n from (${sql}) t`, params))[0]!.n;
  const policyNames = async () =>
    (
      await db.query<{ n: string }>(
        `select tablename || ': ' || policyname as n from pg_policies where schemaname = 'public' order by 1`,
      )
    ).rows.map((row) => row.n);

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyWebMigration(db);
    await applyHardeningMigration(db);
    await applyIntegrityMigration(db);
    await seedFixtures(db);
    await applyCareMigration(db);
    // Kesalahan operator yang dibayangkan: baris psikolog dengan id = id akun login Mallory (penyerang biasa).
    await db.exec(`
      insert into public.psychologists (id, full_name, is_active) values ('${ID.mallory}', 'Salah Buat', true);
      insert into public.consultations (id, user_id, psychologist_id, scheduled_at, status)
      values ('${CONSULTATION}', '${ID.alice}', '${ID.mallory}', now() + interval '1 day', 'confirmed');
    `);
  }, 90_000);

  afterAll(async () => {
    await db.close();
  });

  it('SEBELUM migrasi: Mallory (aal1, tanpa care_links) membaca data Alice lewat policy lama (celahnya nyata)', async () => {
    const session = withAal1(mallory);
    expect(
      await count(session, `select 1 from public.assessments where user_id = $1`, [ID.alice]),
    ).toBe(1);
    expect(await count(session, `select 1 from public.profiles where id = $1`, [ID.alice])).toBe(1);
    expect(
      await count(session, `select 1 from public.consultations where user_id = $1`, [ID.alice]),
    ).toBe(1);
  });

  it('SESUDAH migrasi: keempat jalur itu tertutup', async () => {
    const before = await policyNames();
    await applyLegacyCleanupMigration(db);
    const after = await policyNames();

    const removed = before.filter((name) => !after.includes(name));
    expect(removed.sort()).toEqual([
      'assessments: Psychologists can view patient assessments',
      'consultations: Psychologists can update their consultations',
      'consultations: Psychologists can view their consultations',
      'profiles: Psychologists can view patient profiles',
    ]);
    // Tidak ada policy yang ditambahkan atau dihapus selain keempat itu.
    expect(after.filter((name) => !before.includes(name))).toEqual([]);

    for (const session of [mallory, withAal1(mallory)]) {
      expect(
        await count(session, `select 1 from public.assessments where user_id = $1`, [ID.alice]),
      ).toBe(0);
      expect(await count(session, `select 1 from public.profiles where id = $1`, [ID.alice])).toBe(
        0,
      );
      expect(
        await count(session, `select 1 from public.consultations where user_id = $1`, [ID.alice]),
      ).toBe(0);
    }
  });

  it('jalur resmi tetap bekerja: psikolog tertaut (aal2) membaca klien, dan aal1 ditolak', async () => {
    const rina = asUser(ID.rina);
    expect(
      await count(rina, `select 1 from public.assessments where user_id = $1`, [ID.alice]),
    ).toBe(1);
    expect(
      await count(withAal1(rina), `select 1 from public.assessments where user_id = $1`, [
        ID.alice,
      ]),
    ).toBe(0);
  });

  it('pemilik tetap membaca data dan profilnya sendiri; pendamping tetap sesuai izin', async () => {
    const alice = asUser(ID.alice);
    expect(
      await count(alice, `select 1 from public.assessments where user_id = $1`, [ID.alice]),
    ).toBe(1);
    expect(await count(alice, `select 1 from public.profiles where id = $1`, [ID.alice])).toBe(1);
    expect(
      await count(alice, `select 1 from public.consultations where user_id = $1`, [ID.alice]),
    ).toBe(1);

    const ibu = asUser(ID.ibu);
    expect(
      await count(ibu, `select 1 from public.mood_entries where user_id = $1`, [ID.alice]),
    ).toBe(1);
    expect(
      await count(ibu, `select 1 from public.assessments where user_id = $1`, [ID.alice]),
    ).toBe(0);
  });

  it('idempotent: dijalankan ulang tidak menimbulkan galat', async () => {
    await expect(applyLegacyCleanupMigration(db)).resolves.toBeUndefined();
  });

  it('tidak memuat perintah selain drop policy (aman, mudah ditinjau)', () => {
    const statements = readMigration(LEGACY_CLEANUP_MIGRATION)
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('--'));
    expect(statements).toHaveLength(4);
    for (const statement of statements)
      expect(statement).toMatch(/^drop policy if exists "[^"]+"\s+on public\.\w+;$/);
  });
});
