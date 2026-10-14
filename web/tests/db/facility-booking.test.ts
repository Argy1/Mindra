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
  applyWebMigration,
  asAnon,
  asService,
  asUser,
  createBaseDatabase,
  expectFailure,
  hasBookingMigration,
  hasCareMigration,
  hasHardeningMigration,
  hasIntegrityMigration,
  hasLegacyCleanupMigration,
  hasMigrations,
  withAal1,
  withSession,
  type Session,
} from './harness';

/**
 * Migrasi 20261014000500: (1) MFA admin faskes di database, (2) penjaga bentrok jadwal (constraint EXCLUDE),
 * (3) fungsi pemesanan. Semua dijalankan di Postgres sungguhan (PGlite) dengan role dan klaim JWT.
 */
const PSYCH_B = '00000000-0000-4000-8000-0000000000e6';
const RINA_B = '00000000-0000-4000-8000-0000000000d5';
const PSYCH_OFF = '00000000-0000-4000-8000-0000000000e7';
const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 3_600_000;

/** Tanggal WIB (YYYY-MM-DD) dari hari kerja pertama yang berjarak minimal `minDays` dari sekarang. */
function weekdayDate(minDays: number, skip = 0): string {
  let found = 0;
  for (let ahead = minDays; ahead < minDays + 40; ahead += 1) {
    const wib = new Date(Date.now() + ahead * DAY_MS + WIB_OFFSET_MS);
    const dow = wib.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      if (found === skip) return wib.toISOString().slice(0, 10);
      found += 1;
    }
  }
  throw new Error('tidak ada hari kerja');
}
const at = (date: string, time: string) => `${date}T${time}+07:00`;
/** Sekarang + offset, dibulatkan ke menit (detik tidak nol dijawab slot_not_offered). */
const minuteAligned = (offsetMs: number) =>
  new Date(Math.floor((Date.now() + offsetMs) / 60_000) * 60_000).toISOString();

describe.skipIf(
  !hasMigrations ||
    !hasHardeningMigration ||
    !hasIntegrityMigration ||
    !hasCareMigration ||
    !hasLegacyCleanupMigration ||
    !hasBookingMigration,
)('migrasi facility_mfa_and_booking (Fase 4)', () => {
  let db: PGlite;
  const alice = asUser(ID.alice);
  const bob = asUser(ID.bob);
  const mallory = asUser(ID.mallory);
  const rina = asUser(ID.rina);
  const fia = asUser(ID.fia);
  const zed = asUser(ID.zed);

  const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
    withSession(db, session, (q) => q<T>(sql, params));
  const book = (session: Session, psychologist: string, when: string) =>
    run<{
      id: string;
      scheduled_at: string;
      duration_minutes: number;
      booking_fee: number;
      status: string;
    }>(session, 'select * from public.book_consultation($1, $2::timestamptz)', [
      psychologist,
      when,
    ]);
  const failure = (session: Session, psychologist: string, when: string) =>
    expectFailure(db, session, 'select * from public.book_consultation($1, $2::timestamptz)', [
      psychologist,
      when,
    ]);

  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + DAY_MS).toISOString().slice(0, 10);
  const aggregate = (session: Session, facility: string) =>
    run<{
      city: string;
      suppressed: boolean;
      active_users: number | null;
      avg_phq9: string | null;
    }>(
      session,
      'select city, suppressed, active_users, avg_phq9 from public.facility_aggregate($1, $2, $3)',
      [facility, weekAgo, tomorrow],
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

    // Jadwal Senin sampai Jumat 09.00 sampai 12.00 untuk dua psikolog (psikolog kedua: akun lain).
    await db.exec(`
      update public.psychologists set consultation_fee = 150000 where id = '${ID.psychologist}';
      insert into auth.users (id, email, raw_user_meta_data)
        values ('${RINA_B}', 'rina-b@t.test', '{"full_name":"Psikolog B"}');
      update public.profiles set role = 'psychologist' where id = '${RINA_B}';
      insert into public.psychologists (id, full_name, profile_id, is_active, consultation_fee)
        values ('${PSYCH_B}', 'Psikolog B', '${RINA_B}', true, 200000);
      insert into public.psychologists (id, full_name, is_active)
        values ('${PSYCH_OFF}', 'Tidak Aktif', false);
      insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
        select p, d, '09:00', '12:00'
          from (values ('${ID.psychologist}'::uuid), ('${PSYCH_B}'::uuid), ('${PSYCH_OFF}'::uuid)) as ps(p),
               generate_series(1, 5) as d;
    `);
  }, 90_000);

  afterAll(async () => {
    await db.close();
  });

  // ─── 1. MFA admin faskes ──────────────────────────────────────────────────────
  describe('MFA admin faskes di database', () => {
    it('admin faskes dengan sesi aal2 membaca agregat faskesnya', async () => {
      const rows = await aggregate(fia, ID.facilityA);
      // Hanya 2 pengguna di Kota Bogor pada fixture: di bawah k = 10, jadi tertekan, tetapi fungsi menjawab.
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.suppressed)).toBe(true);
    });

    it('sesi aal1 (hanya kata sandi) ditolak walau ia admin faskes yang sah', async () => {
      const failed = await expectFailure(
        db,
        withAal1(fia),
        'select * from public.facility_aggregate($1, $2, $3)',
        [ID.facilityA, weekAgo, tomorrow],
      );
      expect(failed.code).toBe('42501');
    });

    it('admin faskes lain tetap ditolak walau aal2', async () => {
      const failed = await expectFailure(
        db,
        zed,
        'select * from public.facility_aggregate($1, $2, $3)',
        [ID.facilityA, weekAgo, tomorrow],
      );
      expect(failed.code).toBe('42501');
    });

    it('pengguna biasa dan anon ditolak', async () => {
      for (const session of [mallory, alice]) {
        const failed = await expectFailure(
          db,
          session,
          'select * from public.facility_aggregate($1, $2, $3)',
          [ID.facilityA, weekAgo, tomorrow],
        );
        expect(failed.code).toBe('42501');
      }
      const anon = await expectFailure(
        db,
        asAnon,
        'select * from public.facility_aggregate($1, $2, $3)',
        [ID.facilityA, weekAgo, tomorrow],
      );
      expect(anon.code).toBe('42501');
    });

    it('service_role (API mitra lewat kunci API) tidak terpengaruh MFA', async () => {
      const rows = await aggregate(asService, ID.facilityA);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('sakelar demo app.psychologist_mfa = off melonggarkan aal1; salah ketik tidak', async () => {
      const off = await withSession(db, withAal1(fia), async (q) => {
        await q(`select set_config('app.psychologist_mfa', 'off', true)`);
        return q('select * from public.facility_aggregate($1, $2, $3)', [
          ID.facilityA,
          weekAgo,
          tomorrow,
        ]);
      });
      expect(off.length).toBeGreaterThan(0);

      const typo = await expectFailure(
        db,
        withAal1(fia),
        `select set_config('app.psychologist_mfa', 'OFF', true), * from public.facility_aggregate($1, $2, $3)`,
        [ID.facilityA, weekAgo, tomorrow],
      );
      expect(typo.code).toBe('42501');
    });

    it('k-anonymity tetap: 10 pengguna tampil dengan rata-rata, 9 tertekan', async () => {
      const inserts: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const id = `00000000-0000-4000-8000-00000000${(1000 + i).toString(16).padStart(4, '0')}`;
        inserts.push(
          `insert into auth.users (id, email) values ('${id}', 'kota-a-${i}@t.test');
           update public.profiles set city = 'Kota Bogor', domicile_province = 'Jawa Barat' where id = '${id}';
           insert into public.assessments (user_id, type, answers, total_score, category)
             values ('${id}', 'phq9', '[{"question_id":"phq9_1","score":1}]', 10, public.classify_assessment('phq9', 10));`,
        );
      }
      for (let i = 0; i < 9; i += 1) {
        const id = `00000000-0000-4000-8000-00000000${(2000 + i).toString(16).padStart(4, '0')}`;
        inserts.push(
          `insert into auth.users (id, email) values ('${id}', 'kota-b-${i}@t.test');
           update public.profiles set city = 'Kab. Cianjur', domicile_province = 'Jawa Barat' where id = '${id}';
           insert into public.assessments (user_id, type, answers, total_score, category)
             values ('${id}', 'phq9', '[{"question_id":"phq9_1","score":1}]', 10, public.classify_assessment('phq9', 10));`,
        );
      }
      await db.exec(inserts.join('\n'));

      const rows = await aggregate(fia, ID.facilityA);
      const bogor = rows.filter((row) => row.city === 'Kota Bogor' && !row.suppressed);
      expect(bogor.length).toBeGreaterThan(0);
      expect(Number(bogor[0]!.avg_phq9)).toBeGreaterThan(0);
      const cianjur = rows.filter((row) => row.city === 'Kab. Cianjur');
      expect(cianjur.length).toBeGreaterThan(0);
      expect(cianjur.every((row) => row.suppressed && row.avg_phq9 === null)).toBe(true);
    });
  });

  describe('admin faskes tidak punya jalan ke data perorangan', () => {
    it.each([
      'assessments',
      'mood_entries',
      'sleep_entries',
      'crisis_alerts',
      'care_links',
      'consultations',
      'ai_conversations',
      'data_access_logs',
    ])('membaca %s langsung: 0 baris walau sesi aal2 dan faskesnya sah', async (table) => {
      const rows = await run<{ n: number }>(fia, `select count(*)::int as n from public.${table}`);
      expect(rows[0]!.n).toBe(0);
    });

    it('profil: hanya miliknya sendiri', async () => {
      const rows = await run<{ id: string }>(fia, 'select id from public.profiles');
      expect(rows.map((row) => row.id)).toEqual([ID.fia]);
    });
  });

  describe('kunci API: membuat dan mencabut butuh aal2', () => {
    const insertKey = (session: Session, hash: string) =>
      run(
        session,
        `insert into public.api_clients (name, owner_id, facility_id, key_prefix, key_hash)
         values ('uji', $1, $2, 'abcd1234', $3) returning id`,
        [ID.fia, ID.facilityA, hash],
      );

    it('aal2: berhasil; aal1: ditolak RLS', async () => {
      expect(await insertKey(fia, 'hash-aal2')).toHaveLength(1);
      const failed = await expectFailure(
        db,
        withAal1(fia),
        `insert into public.api_clients (name, owner_id, facility_id, key_prefix, key_hash)
         values ('uji', $1, $2, 'abcd1234', 'hash-aal1')`,
        [ID.fia, ID.facilityA],
      );
      expect(failed.code).toBe('42501');
    });

    it('mencabut kunci dengan sesi aal1 tidak mengubah apa pun; aal2 berhasil', async () => {
      await db.exec(
        `insert into public.api_clients (id, name, owner_id, facility_id, key_prefix, key_hash)
         values ('00000000-0000-4000-8000-0000000000aa', 'cabut', '${ID.fia}', '${ID.facilityA}', 'zzzz9999', 'hash-revoke')`,
      );
      const asAal1 = await run(
        withAal1(fia),
        `update public.api_clients set revoked_at = now()
          where id = '00000000-0000-4000-8000-0000000000aa' returning id`,
      );
      expect(asAal1).toHaveLength(0);
      const asAal2 = await run(
        fia,
        `update public.api_clients set revoked_at = now()
          where id = '00000000-0000-4000-8000-0000000000aa' returning id`,
      );
      expect(asAal2).toHaveLength(1);
    });
  });

  // ─── 2. Penjaga bentrok jadwal dan pemesanan ──────────────────────────────────
  // Setiap tes berjalan di transaksi yang di-rollback (withSession), jadi keadaan awal ditanam di sini
  // lewat superuser, mewakili pemesanan yang sudah ada.
  describe('pemesanan konsultasi', () => {
    const monday = weekdayDate(3);
    const nextDay = weekdayDate(3, 1);
    const c = {
      aliceMonday10: '00000000-0000-4000-8000-0000000000c1',
      bobNextDay10: '00000000-0000-4000-8000-0000000000c2',
      aliceCompleted: '00000000-0000-4000-8000-0000000000c4',
    };

    beforeAll(async () => {
      await db.exec(`
        insert into public.consultations (id, user_id, psychologist_id, scheduled_at, duration_minutes, status, booking_fee) values
          ('${c.aliceMonday10}', '${ID.alice}', '${ID.psychologist}', '${at(monday, '10:00:00')}', 50, 'confirmed', 150000),
          ('${c.bobNextDay10}',  '${ID.bob}',   '${ID.psychologist}', '${at(nextDay, '10:00:00')}', 50, 'confirmed', 150000),
          ('${c.aliceCompleted}', '${ID.alice}', '${PSYCH_B}',        '${at(monday, '11:00:00')}', 50, 'completed', 200000);
        -- Pendamping Alice dipakai sebagai pengguna yang sudah punya 3 sesi mendatang.
        insert into public.consultations (user_id, psychologist_id, scheduled_at, duration_minutes, status) values
          ('${ID.ibu}', '${PSYCH_B}', '${at(nextDay, '09:00:00')}', 50, 'confirmed'),
          ('${ID.ibu}', '${PSYCH_B}', '${at(nextDay, '10:00:00')}', 50, 'pending'),
          ('${ID.ibu}', '${PSYCH_B}', '${at(nextDay, '11:00:00')}', 50, 'confirmed');
      `);
    });

    it('jam yang ditawarkan berhasil: sesi 50 menit, terjadwal, biaya dari psikolog', async () => {
      const [row] = await book(bob, ID.psychologist, at(monday, '09:00:00'));
      expect(row).toMatchObject({ duration_minutes: 50, booking_fee: 150000, status: 'confirmed' });
      expect(new Date(row!.scheduled_at).toISOString()).toBe(
        new Date(at(monday, '09:00:00')).toISOString(),
      );
    });

    it('jam yang sudah dipesan pengguna lain: slot_taken', async () => {
      const failed = await failure(bob, ID.psychologist, at(monday, '10:00:00'));
      expect(failed).toMatchObject({ message: 'slot_taken', code: 'P0001' });
    });

    it('pasien yang sama di jam yang sama dengan psikolog lain: patient_busy', async () => {
      const failed = await failure(alice, PSYCH_B, at(monday, '10:00:00'));
      expect(failed.message).toBe('patient_busy');
    });

    it('psikolog lain di jam yang sama masih kosong untuk pengguna lain', async () => {
      expect(await book(bob, PSYCH_B, at(monday, '10:00:00'))).toHaveLength(1);
    });

    it.each([
      ['di luar kisi 60 menit (10.30)', '10:30:00'],
      ['sebelum jadwal mulai (08.00)', '08:00:00'],
      ['sesi akan melewati jam jadwal berakhir (11.30)', '11:30:00'],
      ['setelah jadwal berakhir (12.00)', '12:00:00'],
      ['detik tidak nol', '11:00:30'],
    ])('jam yang tidak ditawarkan: %s', async (_label, time) => {
      const failed = await failure(mallory, ID.psychologist, at(monday, time));
      expect(failed.message).toBe('slot_not_offered');
    });

    it('hari tanpa jadwal (Minggu) tidak ditawarkan', async () => {
      let sunday = '';
      for (let ahead = 3; ahead < 12; ahead += 1) {
        const wib = new Date(Date.now() + ahead * DAY_MS + WIB_OFFSET_MS);
        if (wib.getUTCDay() === 0) {
          sunday = wib.toISOString().slice(0, 10);
          break;
        }
      }
      const failed = await failure(mallory, ID.psychologist, at(sunday, '10:00:00'));
      expect(failed.message).toBe('slot_not_offered');
    });

    it('terlalu dekat (kurang dari satu jam) dan terlalu jauh (lebih dari 30 hari)', async () => {
      const soon = await failure(mallory, ID.psychologist, minuteAligned(20 * 60_000));
      expect(soon.message).toBe('too_soon');
      const far = await failure(mallory, ID.psychologist, minuteAligned(40 * DAY_MS));
      expect(far.message).toBe('too_far');
    });

    it('psikolog tidak aktif, tidak ada, atau milik akun sendiri: psychologist_unavailable', async () => {
      expect((await failure(mallory, PSYCH_OFF, at(monday, '11:00:00'))).message).toBe(
        'psychologist_unavailable',
      );
      expect(
        (await failure(mallory, '00000000-0000-4000-8000-00000000ffff', at(monday, '11:00:00')))
          .message,
      ).toBe('psychologist_unavailable');
      expect((await failure(rina, ID.psychologist, at(monday, '11:00:00'))).message).toBe(
        'psychologist_unavailable',
      );
    });

    it('anon tidak boleh memanggil fungsi', async () => {
      const failed = await failure(asAnon, ID.psychologist, at(monday, '11:00:00'));
      expect(failed.code).toBe('42501');
    });

    it('maksimal 3 sesi mendatang per pasien: yang keempat limit_reached', async () => {
      const failed = await failure(asUser(ID.ibu), ID.psychologist, at(monday, '11:00:00'));
      expect(failed.message).toBe('limit_reached');
    });

    it('sesi yang dibatalkan membebaskan slot untuk dipesan lagi', async () => {
      const result = await withSession(db, alice, async (q) => {
        const cancelled = await q(
          `update public.consultations set status = 'cancelled' where id = $1 returning id`,
          [c.aliceMonday10],
        );
        const rebooked = await q('select * from public.book_consultation($1, $2::timestamptz)', [
          ID.psychologist,
          at(monday, '10:00:00'),
        ]);
        return { cancelled: cancelled.length, rebooked: rebooked.length };
      });
      expect(result).toEqual({ cancelled: 1, rebooked: 1 });
    });

    it('sesi yang sudah selesai tidak memblokir jam itu bagi pengguna lain', async () => {
      expect(await book(bob, PSYCH_B, at(monday, '11:00:00'))).toHaveLength(1);
    });

    describe('constraint berlaku juga untuk penulis langsung (mis. aplikasi Flutter)', () => {
      const insert = (session: Session, user: string, psychologist: string, when: string) =>
        run(
          session,
          `insert into public.consultations (user_id, psychologist_id, scheduled_at, duration_minutes, status)
           values ($1, $2, $3::timestamptz, 50, 'pending') returning id`,
          [user, psychologist, when],
        );

      it('tumpang-tindih sebagian ditolak (23P01); berurutan rapat diterima', async () => {
        const overlap = await expectFailure(
          db,
          bob,
          `insert into public.consultations (user_id, psychologist_id, scheduled_at, duration_minutes, status)
           values ($1, $2, $3::timestamptz, 50, 'pending')`,
          [ID.bob, ID.psychologist, at(monday, '10:30:00')],
        );
        expect(overlap.code).toBe('23P01');
        // Sesi Alice selesai tepat 10.50; sesi lain mulai 10.50 tidak tumpang-tindih (rentang setengah terbuka).
        expect(await insert(bob, ID.bob, ID.psychologist, at(monday, '10:50:00'))).toHaveLength(1);
      });

      it('pasien yang sama tidak bisa double-booking lewat penulisan langsung', async () => {
        const failed = await expectFailure(
          db,
          alice,
          `insert into public.consultations (user_id, psychologist_id, scheduled_at, duration_minutes, status)
           values ($1, $2, $3::timestamptz, 50, 'pending')`,
          [ID.alice, PSYCH_B, at(monday, '10:20:00')],
        );
        expect(failed.code).toBe('23P01');
      });
    });
  });

  describe('jam terisi tanpa data pribadi', () => {
    const monday = weekdayDate(3);
    const slots = (session: Session, psychologist: string, from: string, to: string) =>
      run<Record<string, unknown>>(
        session,
        'select * from public.psychologist_booked_slots($1, $2::timestamptz, $3::timestamptz)',
        [psychologist, from, to],
      );
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 30 * DAY_MS).toISOString();

    it('hanya waktu dan lama sesi, tanpa kolom identitas', async () => {
      const rows = await slots(mallory, ID.psychologist, from, to);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(['duration_minutes', 'scheduled_at']);
      }
    });

    it('rentang lebih dari 62 hari atau terbalik menghasilkan kosong', async () => {
      const wide = new Date(Date.now() + 90 * DAY_MS).toISOString();
      expect(await slots(mallory, ID.psychologist, from, wide)).toHaveLength(0);
      expect(await slots(mallory, ID.psychologist, to, from)).toHaveLength(0);
    });

    it('anon tidak boleh memanggil fungsi', async () => {
      const failed = await expectFailure(
        db,
        asAnon,
        'select * from public.psychologist_booked_slots($1, $2::timestamptz, $3::timestamptz)',
        [ID.psychologist, from, to],
      );
      expect(failed.code).toBe('42501');
    });

    it('sesi yang dibatalkan tidak muncul sebagai terisi', async () => {
      const result = await withSession(db, alice, async (q) => {
        const before = await q(
          'select * from public.psychologist_booked_slots($1, $2::timestamptz, $3::timestamptz)',
          [ID.psychologist, at(monday, '09:00:00'), at(monday, '12:00:00')],
        );
        await q(
          `update public.consultations set status = 'cancelled'
            where user_id = $1 and psychologist_id = $2 and status = 'confirmed'`,
          [ID.alice, ID.psychologist],
        );
        const after = await q(
          'select * from public.psychologist_booked_slots($1, $2::timestamptz, $3::timestamptz)',
          [ID.psychologist, at(monday, '09:00:00'), at(monday, '12:00:00')],
        );
        return { before: before.length, after: after.length };
      });
      expect(result.before).toBe(1);
      expect(result.after).toBe(0);
    });
  });

  describe('jadwal milik psikolog', () => {
    const schedule = (session: Session) =>
      run<{ id: string; client_id: string | null; client_name: string | null; status: string }>(
        session,
        `select id, client_id, client_name, status
           from public.psychologist_schedule($1::timestamptz, $2::timestamptz)`,
        [new Date().toISOString(), new Date(Date.now() + 60 * DAY_MS).toISOString()],
      );

    it('psikolog melihat sesinya; nama hanya untuk klien yang menautkan akunnya', async () => {
      const rows = await schedule(rina);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      const linked = rows.filter((row) => row.client_id === ID.alice);
      const unlinked = rows.filter((row) => row.client_id === null);
      expect(linked.length).toBeGreaterThan(0);
      expect(linked.every((row) => row.client_name === 'Alice')).toBe(true);
      // Bob memesan tetapi tidak menautkan akun: sesinya terlihat sebagai waktu, tanpa identitas.
      expect(unlinked.length).toBeGreaterThan(0);
      expect(unlinked.every((row) => row.client_name === null)).toBe(true);
      expect(JSON.stringify(rows)).not.toContain('Bob');
    });

    it('wajib aal2 seperti pembacaan data klien', async () => {
      expect(await schedule(withAal1(rina))).toHaveLength(0);
    });

    it('psikolog lain hanya melihat sesinya sendiri; pengguna biasa dan anon tidak melihat apa pun', async () => {
      const other = await schedule(asUser(RINA_B));
      expect(other.length).toBeGreaterThan(0);
      expect(other.some((row) => row.client_id === ID.alice)).toBe(false);
      expect(await schedule(mallory)).toHaveLength(0);
    });

    it('rentang lebih dari 93 hari menghasilkan kosong', async () => {
      const rows = await run(
        rina,
        `select * from public.psychologist_schedule($1::timestamptz, $2::timestamptz)`,
        [new Date().toISOString(), new Date(Date.now() + 120 * DAY_MS).toISOString()],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
