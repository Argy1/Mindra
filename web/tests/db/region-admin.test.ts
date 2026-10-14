// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyBookingMigration,
  applyCareMigration,
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
 * Migrasi 20261014000600 (gelombang 1 sebelum deploy): opt-in statistik wilayah, hapus akun mandiri,
 * peninjauan psikolog oleh admin, dan penjaga yang melindunginya. Dijalankan di Postgres sungguhan
 * (PGlite) dengan peran dan klaim JWT. Daftar slot dibandingkan dengan kode web di consultation-parity.test.ts.
 */
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const crowd = (n: number) => uuid(0x1000 + n); // pengguna tambahan untuk ambang k-anonymity
const APPLICANT = uuid(0x2001);
const APPLICANT_2 = uuid(0x2002);
const DAY_MS = 86_400_000;

const skip =
  !hasMigrations ||
  !hasHardeningMigration ||
  !hasIntegrityMigration ||
  !hasCareMigration ||
  !hasLegacyCleanupMigration ||
  !hasBookingMigration ||
  !hasRegionAdminMigration;

async function migrateUntilBooking(db: PGlite) {
  await applyWebMigration(db);
  await applyHardeningMigration(db);
  await applyIntegrityMigration(db);
  await seedFixtures(db);
  await applyCareMigration(db);
  await applyLegacyCleanupMigration(db);
  await applyBookingMigration(db);
}

describe.skipIf(skip)('migrasi region_optin_admin_review (gelombang 1)', () => {
  let db: PGlite;
  const alice = asUser(ID.alice);
  const bob = asUser(ID.bob);
  const rina = asUser(ID.rina);
  const ibu = asUser(ID.ibu);
  const fia = asUser(ID.fia);
  const admin = asUser(ID.admin);

  const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
    withSession(db, session, (q) => q<T>(sql, params));
  const failure = (session: Session, sql: string, params?: unknown[]) =>
    expectFailure(db, session, sql, params);

  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + DAY_MS).toISOString().slice(0, 10);
  const aggregate = () =>
    run<{ city: string; suppressed: boolean; active_users: number | null }>(
      fia,
      'select city, suppressed, active_users from public.facility_aggregate($1, $2, $3)',
      [ID.facilityA, weekAgo, tomorrow],
    );

  type ReviewFields = Partial<{
    name: string | null;
    title: string | null;
    str: string | null;
    specializations: string[];
    fee: number;
    verified: boolean;
    days: number[];
    start: string | null;
    end: string | null;
  }>;
  const REVIEW_SQL = `select public.admin_review_psychologist($1, $2, $3, $4, $5, $6::text[], $7, $8, $9::integer[], $10::time, $11::time)`;
  const reviewArgs = (profile: string, decision: string, fields: ReviewFields) => [
    profile,
    decision,
    fields.name === undefined ? 'Dr. Calon Satu' : fields.name,
    fields.title ?? null,
    fields.str === undefined ? 'STR-123456' : fields.str,
    fields.specializations ?? ['Kecemasan'],
    fields.fee ?? 150000,
    fields.verified ?? true,
    fields.days ?? [1, 3, 5],
    fields.start === undefined ? '09:00' : fields.start,
    fields.end === undefined ? '12:00' : fields.end,
  ];
  const reviewFailure = (
    profile: string,
    decision: string,
    fields: ReviewFields = {},
    session: Session = admin,
  ) => failure(session, REVIEW_SQL, reviewArgs(profile, decision, fields));

  beforeAll(async () => {
    db = await createBaseDatabase();
    await migrateUntilBooking(db);
    await applyRegionAdminMigration(db);

    // 12 pengguna tambahan di Kota Bogor dengan catatan mood pekan ini, TANPA persetujuan wilayah.
    for (let i = 1; i <= 12; i += 1) {
      await db.exec(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ('${crowd(i)}', 'crowd${i}@t.test', '{"full_name":"Crowd ${i}"}')`,
      );
    }
    await db.exec(`
      update public.profiles set city = 'Kota Bogor', domicile_province = 'Jawa Barat'
       where id in (${Array.from({ length: 12 }, (_, i) => `'${crowd(i + 1)}'`).join(',')});
      insert into public.mood_entries (user_id, mood_type)
        select id, 'lelah' from public.profiles where city = 'Kota Bogor';

      -- Dua pemohon akun psikolog (permintaan diatur sistem; sesi pengguna tidak bisa).
      insert into auth.users (id, email, raw_user_meta_data) values
        ('${APPLICANT}',   'calon1@t.test', '{"full_name":"Calon Satu"}'),
        ('${APPLICANT_2}', 'calon2@t.test', '{"full_name":"Calon Dua"}');
      update public.profiles set requested_role = 'psychologist'
       where id in ('${APPLICANT}', '${APPLICANT_2}');
    `);
  }, 120_000);

  afterAll(async () => {
    await db.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('persetujuan statistik wilayah', () => {
    const setConsent = (ids: string[], value: boolean) =>
      db.exec(
        `update public.profiles set share_region_stats = ${value}
          where id in (${ids.map((id) => `'${id}'`).join(',')})`,
      );
    const crowdIds = Array.from({ length: 12 }, (_, i) => crowd(i + 1));

    it('kolom baru bawaannya MATI: tanpa persetujuan, tidak ada satu pun pengguna dihitung', async () => {
      // Dihitung sebagai pemilik: sesi pengguna hanya melihat barisnya sendiri (RLS), jadi akan selalu 0.
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from public.profiles where share_region_stats`,
      );
      expect(rows[0]?.n).toBe(0);
      expect(await aggregate()).toEqual([]);
    });

    it('setelah 12 pengguna menyetujui, kota mereka muncul (k >= 10 terpenuhi)', async () => {
      await setConsent(crowdIds, true);
      const rows = await aggregate();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ city: 'Kota Bogor', suppressed: false, active_users: 12 });
    });

    it('menarik persetujuan langsung berlaku: sisa 9 pengguna membuat kota itu disembunyikan', async () => {
      await setConsent(crowdIds.slice(0, 3), false);
      const rows = await aggregate();
      expect(rows[0]).toMatchObject({ city: 'Kota Bogor', suppressed: true, active_users: null });
      await setConsent(crowdIds.slice(0, 3), true); // pulihkan
    });

    it('pengguna mengatur persetujuannya sendiri lewat sesi masuknya; tidak bisa mengubah milik orang lain', async () => {
      const result = await withSession(db, alice, async (q) => {
        await q(`update public.profiles set share_region_stats = true where id = $1`, [ID.alice]);
        const [own] = await q<{ share_region_stats: boolean }>(
          `select share_region_stats from public.profiles where id = $1`,
          [ID.alice],
        );
        // Mengubah baris orang lain: RLS membuatnya 0 baris, bukan galat.
        const touched = await q<{ id: string }>(
          `update public.profiles set share_region_stats = true where id = $1 returning id`,
          [ID.mallory],
        );
        return { own: own?.share_region_stats, touched };
      });
      expect(result.own).toBe(true);
      expect(result.touched).toEqual([]);
    });

    it('tanpa kota atau provinsi, persetujuan otomatis mati (aplikasi yang mengosongkan kota tidak kena galat)', async () => {
      // Mallory tidak punya kota dan provinsi: menyetujui pun berujung mati.
      const mallory = await withSession(db, asUser(ID.mallory), async (q) => {
        await q(`update public.profiles set share_region_stats = true where id = $1`, [ID.mallory]);
        return (
          await q<{ share_region_stats: boolean }>(
            `select share_region_stats from public.profiles where id = $1`,
            [ID.mallory],
          )
        )[0]?.share_region_stats;
      });
      expect(mallory).toBe(false);

      // Pengguna yang sudah menyetujui lalu mengosongkan kotanya: persetujuan ikut mati, tanpa galat.
      const crowd5 = await withSession(db, asUser(crowd(5)), async (q) => {
        await q(`update public.profiles set city = '   ' where id = $1`, [crowd(5)]);
        return (
          await q<{ share_region_stats: boolean }>(
            `select share_region_stats from public.profiles where id = $1`,
            [crowd(5)],
          )
        )[0]?.share_region_stats;
      });
      expect(crowd5).toBe(false);

      // Hal yang sama untuk provinsi yang dikosongkan.
      const crowd6 = await withSession(db, asUser(crowd(6)), async (q) => {
        await q(`update public.profiles set domicile_province = null where id = $1`, [crowd(6)]);
        return (
          await q<{ share_region_stats: boolean }>(
            `select share_region_stats from public.profiles where id = $1`,
            [crowd(6)],
          )
        )[0]?.share_region_stats;
      });
      expect(crowd6).toBe(false);
    });

    it('akun demo yang sudah punya kota dan provinsi disetujui otomatis saat migrasi (pengguna nyata tidak)', async () => {
      const fresh = await createBaseDatabase();
      try {
        await migrateUntilBooking(fresh);
        await fresh.exec(`
          insert into auth.users (id, email, raw_user_meta_data) values
            ('${uuid(0x3001)}', 'demo-lengkap@t.test', '{"full_name":"Demo Lengkap"}'),
            ('${uuid(0x3002)}', 'demo-tanpa-kota@t.test', '{"full_name":"Demo Tanpa Kota"}'),
            ('${uuid(0x3003)}', 'nyata@t.test', '{"full_name":"Pengguna Nyata"}');
          update public.profiles set is_demo = true, city = 'Kota Bogor', domicile_province = 'Jawa Barat'
           where id = '${uuid(0x3001)}';
          update public.profiles set is_demo = true where id = '${uuid(0x3002)}';
          update public.profiles set city = 'Kota Bogor', domicile_province = 'Jawa Barat'
           where id = '${uuid(0x3003)}';
        `);
        await applyRegionAdminMigration(fresh);
        const rows = (
          await fresh.query<{ id: string; share_region_stats: boolean }>(
            `select id, share_region_stats from public.profiles where id in ('${uuid(0x3001)}','${uuid(0x3002)}','${uuid(0x3003)}')`,
          )
        ).rows;
        const flag = (id: string) => rows.find((row) => row.id === id)?.share_region_stats;
        expect(flag(uuid(0x3001))).toBe(true);
        expect(flag(uuid(0x3002))).toBe(false);
        expect(flag(uuid(0x3003))).toBe(false);
      } finally {
        await fresh.close();
      }
    });

    it('migrasi bisa dijalankan ulang tanpa mengubah persetujuan yang sudah ada (idempotent)', async () => {
      const count = async () =>
        (
          await db.query<{ n: number }>(
            `select count(*)::int as n from public.profiles where share_region_stats`,
          )
        ).rows[0]?.n;
      const before = await count();
      expect(before).toBeGreaterThan(0);
      await applyRegionAdminMigration(db);
      expect(await count()).toBe(before);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('hapus akun mandiri', () => {
    it('menghapus akun beserta SELURUH datanya, dan hanya milik pemanggil', async () => {
      const counts = (id: string) =>
        db
          .query<{ t: string; n: number }>(
            `select 'users' as t, count(*)::int as n from auth.users where id = '${id}'
             union all select 'profiles', count(*)::int from public.profiles where id = '${id}'
             union all select 'assessments', count(*)::int from public.assessments where user_id = '${id}'
             union all select 'mood', count(*)::int from public.mood_entries where user_id = '${id}'
             union all select 'sleep', count(*)::int from public.sleep_entries where user_id = '${id}'
             union all select 'care_links', count(*)::int from public.care_links where patient_id = '${id}'
             union all select 'relationships', count(*)::int from public.caregiver_relationships where patient_id = '${id}'`,
          )
          .then((r) => Object.fromEntries(r.rows.map((row) => [row.t, row.n])));

      // Alice: punya skrining, mood, tidur, tautan psikolog, dan pendamping (fixture).
      const before = await counts(ID.alice);
      expect(before).toMatchObject({ users: 1, profiles: 1, assessments: 1, sleep: 1 });
      expect(before.mood).toBeGreaterThan(0);
      expect(before.care_links).toBeGreaterThan(0);
      expect(before.relationships).toBeGreaterThan(0);
      const bobBefore = await counts(ID.bob);

      const othersBefore = (
        await db.query<{ n: number }>(
          `select count(*)::int as n from auth.users where id <> '${ID.alice}'`,
        )
      ).rows[0]!.n;

      // Transaksi diurus withSession (selalu di-rollback), jadi cek di dalamnya.
      const inside = await withSession(db, alice, async (q) => {
        await q('select public.delete_my_account()');
        await q('reset role'); // baca sebagai pemilik: sesi pengguna tak punya hak atas auth.users dan dibatasi RLS
        return {
          others: (
            await q<{ n: number }>(`select count(*)::int n from auth.users where id <> $1`, [
              ID.alice,
            ])
          )[0]!.n,
          users: (
            await q<{ n: number }>(`select count(*)::int n from auth.users where id = $1`, [
              ID.alice,
            ])
          )[0]!.n,
          assessments: (
            await q<{ n: number }>(
              `select count(*)::int n from public.assessments where user_id = $1`,
              [ID.alice],
            )
          )[0]!.n,
        };
      });
      expect(inside).toMatchObject({ users: 0, assessments: 0 });
      // Hanya akun pemanggil yang hilang: akun orang lain (dan datanya) tidak tersentuh.
      expect(inside.others).toBe(othersBefore);

      // Setelah rollback semuanya kembali; dan data Bob tak pernah tersentuh.
      expect(await counts(ID.alice)).toEqual(before);
      expect(await counts(ID.bob)).toEqual(bobBefore);
    });

    it('penghapusan benar-benar membersihkan di dalam transaksi: profil, skrining, tautan psikolog, dan pendamping', async () => {
      await withSession(db, bob, async (q) => {
        await q('select public.delete_my_account()');
        await q('reset role'); // baca sebagai pemilik: sesi pengguna tak punya hak atas auth.users dan dibatasi RLS
        for (const sql of [
          `select count(*)::int n from public.profiles where id = '${ID.bob}'`,
          `select count(*)::int n from public.caregiver_relationships where patient_id = '${ID.bob}'`,
          `select count(*)::int n from public.mood_entries where user_id = '${ID.bob}'`,
        ]) {
          expect((await q<{ n: number }>(sql))[0]!.n).toBe(0);
        }
      });
    });

    it.each([
      ['psikolog', rina],
      ['pendamping', ibu],
      ['admin faskes', fia],
      ['admin sistem', admin],
    ])(
      'akun %s tidak bisa dihapus lewat jalur mandiri (role_not_deletable)',
      async (_nama, session) => {
        const result = await failure(session, 'select public.delete_my_account()');
        expect(result.message).toBe('role_not_deletable');
      },
    );

    it('sesi pengguna tanpa identitas (klaim sub kosong) ditolak dengan not_signed_in', async () => {
      const result = await failure(
        { uid: null, role: 'authenticated' },
        'select public.delete_my_account()',
      );
      expect(result.message).toBe('not_signed_in');
    });

    it('tanpa masuk: ditolak; anon tidak punya hak menjalankan fungsinya', async () => {
      const result = await failure(asAnon, 'select public.delete_my_account()');
      expect(result.code).toBe('42501');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('daftar slot: aturan batas dan kelayakan psikolog', () => {
    it('slot kurang dari 1 jam dari sekarang TIDAK ditawarkan, slot sesudahnya ditawarkan', async () => {
      // Jadwal sehari penuh setiap hari: jam berapa pun tes ini jalan, selalu ada jam bulat
      // berikutnya yang jatuh kurang dari 1 jam dari sekarang (terlalu dekat untuk dipesan).
      const id = uuid(0x5001);
      await db.exec(`
        insert into public.psychologists (id, full_name, is_active) values ('${id}', 'Dr. Dekat', true);
        insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
          select '${id}', d, '00:00', '23:59' from generate_series(0, 6) d;
      `);
      const before = Date.now();
      const slots = await run<{ slot_at: string }>(
        alice,
        `select slot_at from public.psychologist_available_slots($1, now(), now() + interval '2 days')`,
        [id],
      );
      const times = slots.map((row) => new Date(row.slot_at).getTime());
      expect(times.length).toBeGreaterThan(0);
      // Tidak ada slot yang jaraknya kurang dari 1 jam (toleransi 1 menit untuk waktu eksekusi).
      for (const time of times) expect(time).toBeGreaterThanOrEqual(before + 59 * 60_000);
      // Tetapi slot pertama tetap muncul segera setelah batas itu: jam bulat berikutnya yang
      // jaraknya >= 1 jam, yaitu paling lama 2 jam dari sekarang.
      expect(Math.min(...times)).toBeLessThanOrEqual(before + 2 * 3_600_000 + 60_000);
    });

    it('psikolog yang tidak aktif tidak punya slot walau jadwalnya ada', async () => {
      const id = uuid(0x5002);
      await db.exec(`
        insert into public.psychologists (id, full_name, is_active) values ('${id}', 'Dr. Nonaktif', false);
        insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
          select '${id}', d, '08:00', '17:00' from generate_series(0, 6) d;
      `);
      const slots = await run(
        alice,
        `select slot_at from public.psychologist_available_slots($1, now(), now() + interval '10 days')`,
        [id],
      );
      expect(slots).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('peninjauan psikolog oleh admin', () => {
    it('hanya admin dengan sesi aal2 yang boleh membaca antrean atau memutuskan (42501)', async () => {
      for (const session of [alice, rina, fia, withAal1(admin), asAnon]) {
        expect(
          (await failure(session, 'select * from public.admin_pending_psychologists()')).code,
        ).toBe('42501');
        expect((await reviewFailure(APPLICANT, 'approve', {}, session)).code).toBe('42501');
      }
    });

    it('antrean memuat pemohon (nama, email, waktu) dan tidak memuat pengguna biasa', async () => {
      const rows = await run<{ id: string; name: string; email: string }>(
        admin,
        'select id, name, email from public.admin_pending_psychologists()',
      );
      expect(rows.map((r) => r.id).sort()).toEqual([APPLICANT, APPLICANT_2].sort());
      expect(rows.find((r) => r.id === APPLICANT)).toMatchObject({
        name: 'Calon Satu',
        email: 'calon1@t.test',
      });
      expect(rows.some((r) => r.id === ID.alice)).toBe(false);
    });

    it('persetujuan: peran berubah, direktori terisi, jadwal dibuat, keputusan tercatat, SEMUA dalam satu transaksi', async () => {
      const result = await withSession(db, admin, async (q) => {
        await q(
          `select public.admin_review_psychologist($1, 'approve', 'Dr. Calon Satu', 'M.Psi., Psikolog', 'STR-123456', array['Kecemasan','Tidur'], 175000, true, array[1,3,3,5], '09:00', '12:00')`,
          [APPLICANT],
        );
        const pending = await q<{ id: string }>(
          'select id from public.admin_pending_psychologists()',
        );
        await q('reset role'); // baca hasil sebagai pemilik: RLS profil tidak membuka profil orang lain bagi admin
        const [profile] = await q<{ role: string; requested_role: string | null }>(
          `select role, requested_role from public.profiles where id = $1`,
          [APPLICANT],
        );
        const [ps] = await q<{
          id: string;
          full_name: string;
          title: string;
          str_number: string;
          specializations: string[];
          consultation_fee: number;
          himpsi_verified: boolean;
          is_active: boolean;
        }>(`select * from public.psychologists where profile_id = $1`, [APPLICANT]);
        const days = await q<{ day_of_week: number; start_time: string; end_time: string }>(
          `select day_of_week, start_time::text, end_time::text from public.psychologist_schedules
            where psychologist_id = $1 order by day_of_week`,
          [ps!.id],
        );
        const log = await q<{
          admin_id: string;
          target_id: string;
          target_name: string;
          action: string;
        }>(`select admin_id, target_id, target_name, action from public.admin_actions`);
        return { profile, ps, days, log, pending };
      });

      expect(result.profile).toEqual({ role: 'psychologist', requested_role: null });
      expect(result.ps).toMatchObject({
        full_name: 'Dr. Calon Satu',
        title: 'M.Psi., Psikolog',
        str_number: 'STR-123456',
        specializations: ['Kecemasan', 'Tidur'],
        consultation_fee: 175000,
        himpsi_verified: true,
        is_active: true,
      });
      // Hari ganda (3,3) dibuang; satu baris per hari.
      expect(result.days.map((d) => d.day_of_week)).toEqual([1, 3, 5]);
      expect(result.days[0]).toMatchObject({ start_time: '09:00:00', end_time: '12:00:00' });
      expect(result.log).toEqual([
        {
          admin_id: ID.admin,
          target_id: APPLICANT,
          target_name: 'Calon Satu',
          action: 'approve_psychologist',
        },
      ]);
      expect(result.pending.map((r) => r.id)).toEqual([APPLICANT_2]);
    });

    it('psikolog baru langsung terlihat sebagai psikolog dan jam praktiknya bisa dipesan (daftar slot dan book_consultation)', async () => {
      await withSession(db, admin, async (q) => {
        await q(
          `select public.admin_review_psychologist($1, 'approve', 'Dr. Calon Satu', null, 'STR-1', array[]::text[], 100000, false, array[0,1,2,3,4,5,6], '08:00', '17:00')`,
          [APPLICANT],
        );
      });
      // Admin menyetujui di transaksi yang di-rollback; ulangi sebagai superuser agar bertahan untuk sisa uji.
      await db.exec(`
        update public.profiles set role = 'psychologist', requested_role = null where id = '${APPLICANT}';
        insert into public.psychologists (id, profile_id, full_name, is_active)
          values ('${uuid(0x4001)}', '${APPLICANT}', 'Dr. Calon Satu', true);
        insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
          select '${uuid(0x4001)}', d, '08:00', '17:00' from generate_series(0, 6) d;
      `);
      const from = new Date(Date.now() + 2 * 3_600_000).toISOString();
      const to = new Date(Date.now() + 9 * DAY_MS).toISOString();
      const slots = await run<{ slot_at: string }>(
        alice,
        'select slot_at from public.psychologist_available_slots($1, $2::timestamptz, $3::timestamptz)',
        [uuid(0x4001), from, to],
      );
      expect(slots.length).toBeGreaterThan(40);
      const first = slots[0]!.slot_at;
      const booked = await run<{ status: string }>(
        alice,
        'select status from public.book_consultation($1, $2::timestamptz)',
        [uuid(0x4001), first],
      );
      expect(booked[0]?.status).toBe('confirmed');
      const [role] = await run<{ r: string }>(asUser(APPLICANT), 'select public.app_role() as r');
      expect(role?.r).toBe('psychologist');
    });

    it('penolakan: permintaan dihapus, peran tetap user, tidak ada baris direktori, keputusan tercatat', async () => {
      const result = await withSession(db, admin, async (q) => {
        await q(`select public.admin_review_psychologist($1, 'reject')`, [APPLICANT_2]);
        await q('reset role');
        const [profile] = await q<{ role: string; requested_role: string | null }>(
          `select role, requested_role from public.profiles where id = $1`,
          [APPLICANT_2],
        );
        const dir = await q<{ n: number }>(
          `select count(*)::int n from public.psychologists where profile_id = $1`,
          [APPLICANT_2],
        );
        const log = await q<{ action: string; target_name: string }>(
          `select action, target_name from public.admin_actions where target_id = $1`,
          [APPLICANT_2],
        );
        return { profile, dir: dir[0]!.n, log };
      });
      expect(result.profile).toEqual({ role: 'user', requested_role: null });
      expect(result.dir).toBe(0);
      expect(result.log).toEqual([{ action: 'reject_psychologist', target_name: 'Calon Dua' }]);
    });

    it('target yang bukan pemohon (pengguna biasa, psikolog, atau sudah diputuskan) ditolak: not_pending', async () => {
      for (const id of [ID.alice, ID.rina, uuid(0x9999)]) {
        expect((await reviewFailure(id, 'approve')).message, id).toBe('not_pending');
      }
      // Pemohon yang sudah disetujui (di superuser pada uji sebelumnya) tidak bisa diputuskan dua kali.
      expect((await reviewFailure(APPLICANT, 'approve')).message).toBe('not_pending');
    });

    it('masukan tidak valid ditolak dengan token tetap, dan pemohon TETAP menunggu (tidak ada setengah jalan)', async () => {
      const fresh = uuid(0x2003);
      await db.exec(`
        insert into auth.users (id, email, raw_user_meta_data) values ('${fresh}', 'calon3@t.test', '{"full_name":"Calon Tiga"}');
        update public.profiles set requested_role = 'psychologist' where id = '${fresh}';
      `);

      const cases: Array<[string, string, ReviewFields, string]> = [
        ['keputusan salah', 'maybe', {}, 'invalid_decision'],
        ['nama kosong', 'approve', { name: '   ' }, 'invalid_name'],
        ['nama terlalu panjang', 'approve', { name: 'x'.repeat(121) }, 'invalid_name'],
        ['STR kosong', 'approve', { str: ' ' }, 'invalid_str'],
        ['STR terlalu panjang', 'approve', { str: 'x'.repeat(61) }, 'invalid_str'],
        ['tarif negatif', 'approve', { fee: -1 }, 'invalid_fee'],
        ['tarif terlalu besar', 'approve', { fee: 5_000_001 }, 'invalid_fee'],
        [
          'spesialisasi kosong',
          'approve',
          { specializations: ['Tidur', ' '] },
          'invalid_specializations',
        ],
        [
          'spesialisasi terlalu banyak',
          'approve',
          { specializations: Array.from({ length: 11 }, (_, i) => `S${i}`) },
          'invalid_specializations',
        ],
        ['hari di luar 0-6', 'approve', { days: [1, 7] }, 'invalid_schedule'],
        [
          'jam akhir sebelum mulai',
          'approve',
          { start: '12:00', end: '09:00' },
          'invalid_schedule',
        ],
        ['jam sama', 'approve', { start: '09:00', end: '09:00' }, 'invalid_schedule'],
        ['hari tanpa jam', 'approve', { start: null, end: null }, 'invalid_schedule'],
      ];
      for (const [label, decision, fields, token] of cases) {
        const result = await reviewFailure(fresh, decision, fields);
        expect(result.message, label).toBe(token);
      }

      // Tidak ada yang berubah setelah semua kegagalan itu.
      const [profile] = (
        await db.query<{ role: string; requested_role: string | null }>(
          `select role, requested_role from public.profiles where id = '${fresh}'`,
        )
      ).rows;
      expect(profile).toEqual({ role: 'user', requested_role: 'psychologist' });
      const dir = await db.query<{ n: number }>(
        `select count(*)::int n from public.psychologists where profile_id = '${fresh}'`,
      );
      expect(dir.rows[0]!.n).toBe(0);
    });

    it('tanpa hari praktik tetap sah (psikolog tampil di direktori tanpa slot); jam hanya wajib bila ada hari', async () => {
      const fresh = uuid(0x2004);
      await db.exec(`
        insert into auth.users (id, email, raw_user_meta_data) values ('${fresh}', 'calon4@t.test', '{"full_name":"Calon Empat"}');
        update public.profiles set requested_role = 'psychologist' where id = '${fresh}';
      `);
      const count = await withSession(db, admin, async (q) => {
        await q(
          `select public.admin_review_psychologist($1, 'approve', 'Dr. Empat', null, 'STR-4', array[]::text[], 0, false, array[]::integer[], null, null)`,
          [fresh],
        );
        return (
          await q<{ n: number }>(
            `select count(*)::int n from public.psychologist_schedules s
               join public.psychologists p on p.id = s.psychologist_id where p.profile_id = $1`,
            [fresh],
          )
        )[0]!.n;
      });
      expect(count).toBe(0);
    });

    it('pintu penjaga kolom profil TIDAK bisa dibuka dari sesi pengguna, walau penandanya dipasang sendiri', async () => {
      const result = await failure(
        alice,
        `with open as (select set_config('app.profile_review', 'on', true))
         update public.profiles set role = 'admin' from open where id = $1`,
        [ID.alice],
      );
      expect(result.code).toBe('42501');

      // Tanpa penanda pun tetap ditolak (perilaku lama tidak berubah).
      for (const sql of [
        `update public.profiles set role = 'psychologist' where id = $1`,
        `update public.profiles set requested_role = 'psychologist' where id = $1`,
        `update public.profiles set is_demo = true where id = $1`,
      ]) {
        expect((await failure(alice, sql, [ID.alice])).code, sql).toBe('42501');
      }
    });

    it('fungsi security definer BIASA (tanpa penanda peninjauan) pun tidak bisa menaikkan peran', async () => {
      await db.exec(`
        create or replace function public.tmp_escalate(p uuid) returns void
        language sql security definer set search_path = '' as $$
          update public.profiles set role = 'admin' where id = p
        $$;
        grant execute on function public.tmp_escalate(uuid) to authenticated;
      `);
      try {
        const result = await failure(alice, 'select public.tmp_escalate($1)', [ID.alice]);
        expect(result.code).toBe('42501');
      } finally {
        await db.exec('drop function public.tmp_escalate(uuid)');
      }
    });

    it('hanya akun BERPERAN user yang bisa diputuskan: psikolog yang masih menyimpan permintaan lama ditolak', async () => {
      await db.exec(
        `update public.profiles set requested_role = 'psychologist' where id = '${ID.rina}'`,
      );
      try {
        expect((await reviewFailure(ID.rina, 'approve')).message).toBe('not_pending');
        expect((await reviewFailure(ID.rina, 'reject')).message).toBe('not_pending');
        const pending = await run<{ id: string }>(
          admin,
          'select id from public.admin_pending_psychologists()',
        );
        expect(pending.map((row) => row.id)).not.toContain(ID.rina);
      } finally {
        await db.exec(`update public.profiles set requested_role = null where id = '${ID.rina}'`);
      }
    });

    it('penanda tidak menempel: setelah keputusan, sesi yang sama tidak bisa mengubah peran', async () => {
      const result = await withSession(db, admin, async (q) => {
        await q(`select public.admin_review_psychologist($1, 'reject')`, [APPLICANT_2]).catch(
          () => undefined,
        );
        try {
          await q(`update public.profiles set role = 'user' where id = $1`, [ID.admin]);
          return 'berhasil';
        } catch (error) {
          return (error as { code?: string }).code ?? 'galat';
        }
      });
      expect(result).toBe('42501');
    });

    it('jejak keputusan TERSIMPAN dibaca admin aal2 saja; pengguna lain dan admin aal1 melihat 0 baris', async () => {
      await db.exec(`
        insert into public.admin_actions (admin_id, target_id, target_name, action)
        values ('${ID.admin}', '${ID.alice}', 'Alice', 'reject_psychologist')`);
      try {
        expect((await run(admin, 'select * from public.admin_actions')).length).toBeGreaterThan(0);
        for (const session of [alice, rina, fia, withAal1(admin)]) {
          expect(await run(session, 'select * from public.admin_actions')).toEqual([]);
        }
      } finally {
        await db.exec('delete from public.admin_actions');
      }
    });

    it('jejak keputusan: admin aal2 membaca; pengguna lain 0 baris; tidak ada yang bisa menulis langsung', async () => {
      await withSession(db, admin, async (q) => {
        await q(`select public.admin_review_psychologist($1, 'reject')`, [APPLICANT_2]);
        expect(
          (await q<{ n: number }>('select count(*)::int n from public.admin_actions'))[0]!.n,
        ).toBeGreaterThan(0);
      });
      expect(await run(alice, 'select * from public.admin_actions')).toEqual([]);
      expect(await run(rina, 'select * from public.admin_actions')).toEqual([]);
      expect(await run(withAal1(admin), 'select * from public.admin_actions')).toEqual([]);
      for (const session of [alice, admin]) {
        const result = await failure(
          session,
          `insert into public.admin_actions (admin_id, target_name, action) values ($1, 'x', 'approve_psychologist')`,
          [ID.admin],
        );
        expect(result.code, 'insert langsung').toBe('42501');
      }
      expect((await failure(admin, `delete from public.admin_actions`)).code).toBe('42501');
    });

    it('sakelar demo MFA (app.psychologist_mfa = off) melonggarkan syarat aal2 untuk admin, sama seperti portal lain', async () => {
      const rows = await withSession(db, withAal1(admin), async (q) => {
        await q(`select set_config('app.psychologist_mfa', 'off', true)`);
        return q('select * from public.admin_pending_psychologists()');
      });
      expect(Array.isArray(rows)).toBe(true);
    });

    it('antrean dan keputusan tidak membocorkan data kesehatan: fungsi hanya menyentuh profiles, psychologists, jadwal, dan jejak', async () => {
      const [fn] = await db
        .query<{ src: string }>(
          `select string_agg(pg_get_functiondef(p.oid), ' ') as src from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('admin_pending_psychologists', 'admin_review_psychologist')`,
        )
        .then((r) => r.rows);
      for (const table of [
        'assessments',
        'mood_entries',
        'sleep_entries',
        'ai_conversations',
        'crisis_alerts',
      ]) {
        expect(fn!.src, table).not.toContain(table);
      }
    });
  });
});
