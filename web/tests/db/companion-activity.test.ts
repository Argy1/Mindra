// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyBookingMigration,
  applyCareMigration,
  applyCompanionMigration,
  applyHardeningMigration,
  applyIntegrityMigration,
  applyLegacyCleanupMigration,
  applyRegionAdminMigration,
  applyWebMigration,
  asAnon,
  asUser,
  createBaseDatabase,
  expectFailure,
  hasBookingMigration,
  hasCareMigration,
  hasCompanionMigration,
  hasHardeningMigration,
  hasIntegrityMigration,
  hasLegacyCleanupMigration,
  hasMigrations,
  hasRegionAdminMigration,
  withAal1,
  withSession,
  type Session,
} from './harness';

/**
 * Migrasi 20261014000700 (gelombang 3): `client_companion_activity`, gambaran penggunaan Teman cerita untuk psikolog
 * yang diizinkan klien (`ai_summary`). Yang dijaga: izin, aal2, tautan aktif, dan bahwa ISI percakapan tidak pernah
 * keluar, juga tidak lewat jalur baca langsung ke tabel.
 */
const SECRET_TEXT = 'RAHASIA-ISI-PERCAKAPAN-12345';

const skip =
  !hasMigrations ||
  !hasHardeningMigration ||
  !hasIntegrityMigration ||
  !hasCareMigration ||
  !hasLegacyCleanupMigration ||
  !hasBookingMigration ||
  !hasRegionAdminMigration ||
  !hasCompanionMigration;

describe.skipIf(skip)('migrasi companion_activity_summary (gelombang 3)', () => {
  let db: PGlite;
  const alice = asUser(ID.alice);
  const bob = asUser(ID.bob);
  const mallory = asUser(ID.mallory);
  const rina = asUser(ID.rina);
  const ibu = asUser(ID.ibu);

  type Activity = {
    conversations: number;
    messages: number;
    active_days: number;
    crisis_conversations: number;
    last_activity: string | null;
  };

  const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
    withSession(db, session, (q) => q<T>(sql, params));
  const failure = (session: Session, sql: string, params?: unknown[]) =>
    expectFailure(db, session, sql, params);
  const activity = async (session: Session, client: string | null, days?: number | null) => {
    const rows = await run<Activity>(
      session,
      days === undefined
        ? 'select * from public.client_companion_activity($1)'
        : 'select * from public.client_companion_activity($1, $2)',
      days === undefined ? [client] : [client, days],
    );
    return rows[0]!;
  };
  const shareSummary = (enabled: boolean) =>
    db.exec(`
      update public.care_links
         set permissions = jsonb_set(permissions, '{ai_summary}', '${enabled}'::jsonb)
       where id = '${ID.careLink}'`);

  const messages = (count: number, text = SECRET_TEXT) =>
    JSON.stringify(
      Array.from({ length: count }, (_, i) => ({
        id: `m${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: text,
        timestamp: '2026-10-01T10:00:00Z',
      })),
    );

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyWebMigration(db);
    await applyHardeningMigration(db);
    await applyIntegrityMigration(db);
    await seedFixtures(db);
    await applyCareMigration(db);
    await applyLegacyCleanupMigration(db);
    await applyBookingMigration(db);
    await applyRegionAdminMigration(db);
    await applyCompanionMigration(db);

    // Percakapan Alice menurut umurnya (umur diatur ulang di bawah karena pemicu updated_at menimpa nilai awal):
    //   c007  3 jam   1 pesan            (masuk jendela 1 hari)
    //   c001  2 hari  4 pesan
    //   c004  2 hari  isi bukan larik    (0 pesan)
    //   c002  5 hari  6 pesan, krisis
    //   c006  20 hari 2 pesan            (hanya jendela 30 hari ke atas; bukan jendela 7 hari)
    //   c003  40 hari 10 pesan, krisis   (hanya jendela 90 hari ke atas)
    //   c008  400 hari 8 pesan           (di luar batas 365 hari)
    // Percakapan Bob (c005, krisis) tidak boleh ikut terhitung.
    const ages: Array<[string, string, string, boolean, string]> = [
      ['c001', ID.alice, messages(4), false, '2 days'],
      ['c002', ID.alice, messages(6), true, '5 days'],
      ['c003', ID.alice, messages(10), true, '40 days'],
      ['c004', ID.alice, '{"bukan":"larik"}', false, '2 days'],
      ['c005', ID.bob, messages(3), true, '1 day'],
      ['c006', ID.alice, messages(2), false, '20 days'],
      ['c007', ID.alice, messages(1), false, '3 hours'],
      ['c008', ID.alice, messages(8), false, '400 days'],
    ];
    for (const [key, owner, content, crisis, age] of ages) {
      await db.exec(`
        alter table public.ai_conversations disable trigger trg_ai_conversations_updated_at;
        insert into public.ai_conversations (id, user_id, messages, crisis_detected, updated_at)
        values ('00000000-0000-4000-8000-00000000${key.slice(1).padStart(4, '0')}'::uuid,
                '${owner}', '${content}'::jsonb, ${crisis}, now() - interval '${age}');
        alter table public.ai_conversations enable trigger trg_ai_conversations_updated_at;
      `);
    }
  });
  afterAll(async () => {
    await db?.close();
  });

  describe('izin dan identitas', () => {
    it('psikolog dengan izin ai_summary, aal2, tautan aktif: membaca ringkasan 30 hari', async () => {
      await shareSummary(true);
      const result = await activity(rina, ID.alice);
      // Dalam 30 hari: c007, c001, c004, c002, c006 = 5 percakapan; 1 + 4 + 0 (bukan larik) + 6 + 2 = 13 pesan;
      // 1 percakapan krisis (c002); 4 hari aktif (3 jam lalu, 2 hari lalu, 5 hari lalu, 20 hari lalu).
      expect(result.conversations).toBe(5);
      expect(result.messages).toBe(13);
      expect(result.crisis_conversations).toBe(1);
      expect(result.active_days).toBe(4);
      // Waktu TERAKHIR (bukan yang terlama): percakapan c007, sekitar 3 jam lalu.
      const ageMs = Date.now() - new Date(result.last_activity as string).getTime();
      expect(ageMs).toBeGreaterThan(2.9 * 3_600_000);
      expect(ageMs).toBeLessThan(3.1 * 3_600_000);
    });

    it('izin ai_summary mati (bawaan): ditolak 42501', async () => {
      await shareSummary(false);
      const result = await failure(rina, 'select * from public.client_companion_activity($1)', [
        ID.alice,
      ]);
      expect(result.code).toBe('42501');
    });

    it('izin lain menyala tetapi ai_summary mati: tetap ditolak (izin tidak saling mewakili)', async () => {
      await db.exec(`
        update public.care_links
           set permissions = '{"assessments":true,"mood":true,"sleep":true,"crisis_alerts":true,"ai_summary":false}'
         where id = '${ID.careLink}'`);
      const result = await failure(rina, 'select * from public.client_companion_activity($1)', [
        ID.alice,
      ]);
      expect(result.code).toBe('42501');
    });

    it('psikolog tanpa TOTP (aal1) ditolak walau izin menyala', async () => {
      await shareSummary(true);
      const result = await failure(
        withAal1(rina),
        'select * from public.client_companion_activity($1)',
        [ID.alice],
      );
      expect(result.code).toBe('42501');
    });

    it('tautan tidak aktif (dicabut): ditolak walau izin menyala di baris itu', async () => {
      await shareSummary(true);
      await db.exec(`update public.care_links set status = 'revoked' where id = '${ID.careLink}'`);
      try {
        const result = await failure(rina, 'select * from public.client_companion_activity($1)', [
          ID.alice,
        ]);
        expect(result.code).toBe('42501');
      } finally {
        await db.exec(`update public.care_links set status = 'active' where id = '${ID.careLink}'`);
      }
    });

    it('klien lain milik psikolog yang sama tidak terbuka: izin hanya untuk klien yang memberinya', async () => {
      await shareSummary(true);
      const result = await failure(rina, 'select * from public.client_companion_activity($1)', [
        ID.bob,
      ]);
      expect(result.code).toBe('42501');
    });

    it('pengguna lain, pendamping, dan anon ditolak', async () => {
      await shareSummary(true);
      for (const session of [mallory, bob, ibu]) {
        const result = await failure(
          session,
          'select * from public.client_companion_activity($1)',
          [ID.alice],
        );
        expect(result.code, String(session.uid)).toBe('42501');
      }
      const anon = await failure(asAnon, 'select * from public.client_companion_activity($1)', [
        ID.alice,
      ]);
      expect(anon.code).toBe('42501');
    });

    it('pendamping tidak bisa walau izinnya ditulis "ai_summary": jenis data itu tidak dipetakan untuk pendamping', async () => {
      await db.exec(`
        update public.caregiver_relationships
           set permissions = permissions || '{"ai_summary":true,"app_activity":true}'::jsonb
         where id = '${ID.aliceRelationship}'`);
      const result = await failure(ibu, 'select * from public.client_companion_activity($1)', [
        ID.alice,
      ]);
      expect(result.code).toBe('42501');
    });

    it('pemilik membaca gambaran miliknya sendiri; klien null ditolak', async () => {
      expect((await activity(alice, ID.alice)).conversations).toBe(5);
      const result = await failure(alice, 'select * from public.client_companion_activity($1)', [
        null,
      ]);
      expect(result.code).toBe('42501');
    });
  });

  describe('isi hitungan', () => {
    it('jendela hari: 7 hari tanpa percakapan 20 hari; 90 hari memuat yang 40 hari; 3 hari hanya yang terbaru', async () => {
      await shareSummary(true);
      const week = await activity(rina, ID.alice, 7);
      expect(week.conversations).toBe(4); // c007, c001, c004, c002 (tanpa c006 yang 20 hari)
      expect(week.messages).toBe(11);

      const wide = await activity(rina, ID.alice, 90);
      expect(wide.conversations).toBe(6); // ditambah c003 (40 hari); c008 (400 hari) tetap di luar
      expect(wide.messages).toBe(23);
      expect(wide.crisis_conversations).toBe(2);

      const narrow = await activity(rina, ID.alice, 3);
      expect(narrow.conversations).toBe(3); // c007, c001, c004
      expect(narrow.messages).toBe(5);
      expect(narrow.crisis_conversations).toBe(0);
    });

    it('jendela dibatasi 1 sampai 365 hari, dan kosong/null berarti 30', async () => {
      await shareSummary(true);
      // Batas bawah 1 hari: 0 dan negatif diperlakukan sebagai 1 hari (c007, 3 jam lalu, tetap terhitung).
      expect((await activity(rina, ID.alice, 0)).conversations).toBe(1);
      expect((await activity(rina, ID.alice, -50)).conversations).toBe(1);
      // Batas atas 365 hari: percakapan 400 hari lalu (c008) tidak pernah ikut, sebesar apa pun permintaannya.
      const huge = await activity(rina, ID.alice, 100000);
      expect(huge.conversations).toBe(6);
      expect(huge.messages).toBe(23);
      const exactly365 = await activity(rina, ID.alice, 365);
      expect(exactly365.conversations).toBe(6);
      // Kosong atau null = 30 hari (bukan 7 dan bukan seluruhnya).
      expect((await activity(rina, ID.alice, null)).conversations).toBe(5);
    });

    it('hanya percakapan milik klien yang dihitung (percakapan Bob tidak ikut)', async () => {
      await shareSummary(true);
      const result = await activity(rina, ID.alice, 90);
      expect(result.conversations).toBe(6);
      expect(result.crisis_conversations).toBe(2);
    });

    it('klien tanpa percakapan: satu baris nol (bukan tanpa baris), waktu terakhir kosong', async () => {
      await db.exec(`
        insert into public.care_links (id, patient_id, psychologist_id, permissions)
        values ('00000000-0000-4000-8000-0000000000c9', '${ID.mallory}', '${ID.psychologist}',
                '{"ai_summary":true}')`);
      try {
        const result = await activity(rina, ID.mallory);
        expect(result).toEqual({
          conversations: 0,
          messages: 0,
          active_days: 0,
          crisis_conversations: 0,
          last_activity: null,
        });
      } finally {
        await db.exec(
          `delete from public.care_links where id = '00000000-0000-4000-8000-0000000000c9'`,
        );
      }
    });

    it('hari aktif dihitung menurut tanggal WIB, bukan UTC', async () => {
      await shareSummary(true);
      // 20.00 UTC hari D-10 = 03.00 WIB hari D-9, dan 02.00 UTC hari D-9 = 09.00 WIB hari D-9: tanggal UTC berbeda,
      // tanggal WIB sama. Dihitung WIB: tambah 1 hari aktif (4 menjadi 5); dihitung UTC: tambah 2.
      await db.exec(`
        alter table public.ai_conversations disable trigger trg_ai_conversations_updated_at;
        insert into public.ai_conversations (id, user_id, messages, updated_at) values
          ('00000000-0000-4000-8000-00000000c101', '${ID.alice}', '[]',
           date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '10 days' + interval '20 hours'),
          ('00000000-0000-4000-8000-00000000c102', '${ID.alice}', '[]',
           date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '9 days' + interval '2 hours');
        alter table public.ai_conversations enable trigger trg_ai_conversations_updated_at;`);
      try {
        const result = await activity(rina, ID.alice);
        expect(result.conversations).toBe(7);
        expect(result.active_days).toBe(5);
      } finally {
        await db.exec(
          `delete from public.ai_conversations where id in ('00000000-0000-4000-8000-00000000c101','00000000-0000-4000-8000-00000000c102')`,
        );
      }
    });
  });

  describe('isi percakapan tidak pernah keluar', () => {
    it('hasil hanya lima kolom hitungan; tidak ada teks', async () => {
      await shareSummary(true);
      const rows = await run<Record<string, unknown>>(
        rina,
        'select * from public.client_companion_activity($1)',
        [ID.alice],
      );
      expect(Object.keys(rows[0]!).sort()).toEqual([
        'active_days',
        'conversations',
        'crisis_conversations',
        'last_activity',
        'messages',
      ]);
      expect(JSON.stringify(rows)).not.toContain(SECRET_TEXT);
    });

    it('tidak ada jalur baca langsung: psikolog berizin tetap melihat 0 baris di ai_conversations', async () => {
      await shareSummary(true);
      const rows = await run(rina, 'select * from public.ai_conversations');
      expect(rows).toEqual([]);
      const forAlice = await run(
        rina,
        'select id from public.ai_conversations where user_id = $1',
        [ID.alice],
      );
      expect(forAlice).toEqual([]);
    });

    it('menjalankan fungsi tidak mengubah apa pun pada tabel', async () => {
      await shareSummary(true);
      const before = await db.query<{ n: number; hash: string }>(
        `select count(*)::int as n, md5(string_agg(id::text || updated_at::text, ',' order by id)) as hash
           from public.ai_conversations`,
      );
      await activity(rina, ID.alice);
      const after = await db.query<{ n: number; hash: string }>(
        `select count(*)::int as n, md5(string_agg(id::text || updated_at::text, ',' order by id)) as hash
           from public.ai_conversations`,
      );
      expect(after.rows[0]).toEqual(before.rows[0]);
    });
  });

  describe('keamanan fungsi', () => {
    it('security definer dengan search_path kosong; anon dan public tidak boleh menjalankannya', async () => {
      const info = await db.query<{
        secdef: boolean;
        config: string[] | null;
        anon: boolean;
        pub: boolean;
        auth: boolean;
      }>(`
        select p.prosecdef as secdef,
               p.proconfig as config,
               has_function_privilege('anon', p.oid, 'execute') as anon,
               has_function_privilege('public', p.oid, 'execute') as pub,
               has_function_privilege('authenticated', p.oid, 'execute') as auth
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'client_companion_activity'`);
      const row = info.rows[0]!;
      expect(row.secdef).toBe(true);
      expect(row.config).toContain('search_path=""');
      expect(row.anon).toBe(false);
      expect(row.pub).toBe(false);
      expect(row.auth).toBe(true);
    });

    it('idempotent: menerapkan migrasi dua kali tidak merusak apa pun', async () => {
      await applyCompanionMigration(db);
      await shareSummary(true);
      expect((await activity(rina, ID.alice)).conversations).toBe(5);
    });
  });
});
