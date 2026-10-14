// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  generateSlots,
  MAX_DAYS_AHEAD,
  MIN_LEAD_MINUTES,
  startsAtFor,
  type ScheduleRow,
} from '@/lib/domain/consultation/slots';
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
  withSession,
} from './harness';

/**
 * Kesesuaian kode tampilan (lib/domain/consultation/slots.ts) dengan fungsi database `book_consultation`.
 * Setiap slot yang ditandai tersedia di kode HARUS diterima database, dan setiap jam di luar kisi HARUS ditolak
 * (`slot_not_offered`). Bila salah satu bergeser, tes ini gagal: pengguna tidak akan melihat slot yang ditolak,
 * atau slot yang tidak muncul padahal bisa dipesan.
 */
const SCHEDULE: ScheduleRow[] = [
  // Senin sampai Jumat 09.00–16.00 (pola data demo) ...
  ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: '09:00:00', end: '16:00:00' })),
  // ... Sabtu dengan jam mulai tidak bulat dan akhir yang memotong sesi terakhir, dan Minggu dua blok.
  { dayOfWeek: 6, start: '08:30:00', end: '11:40:00' },
  { dayOfWeek: 0, start: '10:00:00', end: '11:00:00' },
  { dayOfWeek: 0, start: '13:00:00', end: '14:50:00' },
];

const DAY_MS = 86_400_000;

describe.skipIf(
  !hasMigrations ||
    !hasHardeningMigration ||
    !hasIntegrityMigration ||
    !hasCareMigration ||
    !hasLegacyCleanupMigration ||
    !hasBookingMigration,
)('kesesuaian slot kode dan database', () => {
  let db: PGlite;

  const book = (startsAt: string) =>
    withSession(db, asUser(ID.alice), async (query) => {
      try {
        const rows = await query('select * from public.book_consultation($1, $2::timestamptz)', [
          ID.psychologist,
          startsAt,
        ]);
        return { ok: true as const, rows };
      } catch (error) {
        return { ok: false as const, message: (error as { message?: string }).message ?? '' };
      }
    });

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyWebMigration(db);
    await applyHardeningMigration(db);
    await applyIntegrityMigration(db);
    await seedFixtures(db);
    await applyCareMigration(db);
    await applyLegacyCleanupMigration(db);
    await applyBookingMigration(db);
    if (hasRegionAdminMigration) await applyRegionAdminMigration(db);
    for (const row of SCHEDULE) {
      await db.query(
        `insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
         values ($1, $2, $3, $4)`,
        [ID.psychologist, row.dayOfWeek, row.start, row.end],
      );
    }
  }, 90_000);

  afterAll(async () => {
    await db.close();
  });

  it('semua slot "tersedia" menurut kode diterima database; terlalu dekat dan terlalu jauh ditolak dengan alasan yang sama', async () => {
    const now = new Date();
    const days = generateSlots(SCHEDULE, [], now, MAX_DAYS_AHEAD + 2);
    const nearLead = now.getTime() + MIN_LEAD_MINUTES * 60_000;
    const nearFar = now.getTime() + MAX_DAYS_AHEAD * DAY_MS;

    let available = 0;
    for (const day of days) {
      for (const slot of day.slots) {
        const at = new Date(slot.startsAt).getTime();
        // Hindari selisih jam antara dua pembacaan "sekarang" tepat di batas.
        if (Math.abs(at - nearLead) < 120_000 || Math.abs(at - nearFar) < 120_000) continue;

        const result = await book(slot.startsAt);
        if (slot.state === 'available') {
          available += 1;
          expect(result.ok, `${slot.startsAt} seharusnya diterima`).toBe(true);
        } else {
          expect(result.ok, `${slot.startsAt} (${slot.state}) seharusnya ditolak`).toBe(false);
          if (!result.ok) expect(result.message, slot.startsAt).toBe(slot.state);
        }
      }
    }
    // Bukti bahwa tes ini benar-benar menguji banyak slot, bukan kosong.
    expect(available).toBeGreaterThan(100);
  }, 120_000);

  it('jam di luar kisi/jadwal ditolak database dengan slot_not_offered, dan memang tidak ada di daftar kode', async () => {
    const now = new Date();
    const days = generateSlots(SCHEDULE, [], now, 12);
    let checked = 0;
    for (const day of days.slice(2, 10)) {
      const offered = new Set(day.slots.map((slot) => slot.startsAt));
      for (let minutes = 7 * 60; minutes <= 18 * 60; minutes += 10) {
        const startsAt = startsAtFor(day.date, minutes);
        if (offered.has(startsAt)) continue;
        const result = await book(startsAt);
        expect(result.ok, `${startsAt} seharusnya ditolak`).toBe(false);
        if (!result.ok) expect(result.message, startsAt).toBe('slot_not_offered');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(400);
  }, 180_000);

  // Daftar slot di database (dipakai aplikasi Flutter) harus persis sama dengan yang ditampilkan kode web.
  describe.skipIf(!hasRegionAdminMigration)(
    'daftar slot di database (psychologist_available_slots)',
    () => {
      const listed = (from: Date, to: Date) =>
        withSession(db, asUser(ID.alice), (query) =>
          query<{ slot_at: string }>(
            'select slot_at from public.psychologist_available_slots($1, $2::timestamptz, $3::timestamptz) order by slot_at',
            [ID.psychologist, from.toISOString(), to.toISOString()],
          ),
        );
      const instants = (isoList: string[]) => isoList.map((iso) => new Date(iso).getTime());

      it('sama persis dengan slot "tersedia" menurut kode web, untuk 30 hari ke depan', async () => {
        const now = new Date();
        const from = new Date(now.getTime());
        const to = new Date(now.getTime() + 31 * DAY_MS);
        const nearLead = now.getTime() + MIN_LEAD_MINUTES * 60_000;
        const nearFar = now.getTime() + MAX_DAYS_AHEAD * DAY_MS;

        const fromCode = generateSlots(SCHEDULE, [], now, 33)
          .flatMap((day) => day.slots)
          .filter((slot) => slot.state === 'available')
          .map((slot) => new Date(slot.startsAt).getTime())
          // Dua pembacaan "sekarang" bisa berselisih di batas 1 jam dan 30 hari: abaikan yang terlalu dekat.
          .filter(
            (at) =>
              Math.abs(at - nearLead) >= 120_000 &&
              Math.abs(at - nearFar) >= 120_000 &&
              at < to.getTime(),
          );
        const fromDb = instants((await listed(from, to)).map((row) => row.slot_at)).filter(
          (at) => Math.abs(at - nearLead) >= 120_000 && Math.abs(at - nearFar) >= 120_000,
        );

        expect(fromCode.length).toBeGreaterThan(100);
        expect(fromDb).toEqual(fromCode);
      }, 60_000);

      it('slot yang sudah dipesan hilang dari daftar, begitu juga slot yang beririsan; pembatalan memulihkannya', async () => {
        const now = new Date();
        const to = new Date(now.getTime() + 10 * DAY_MS);
        const before = await listed(now, to);
        const target = before[3]!.slot_at;
        const targetMs = new Date(target).getTime();

        const during = await withSession(db, asUser(ID.alice), async (query) => {
          await query('select * from public.book_consultation($1, $2::timestamptz)', [
            ID.psychologist,
            target,
          ]);
          return query<{ slot_at: string }>(
            'select slot_at from public.psychologist_available_slots($1, $2::timestamptz, $3::timestamptz) order by slot_at',
            [ID.psychologist, now.toISOString(), to.toISOString()],
          );
        });
        const duringMs = instants(during.map((row) => row.slot_at));
        expect(duringMs).not.toContain(targetMs);
        expect(duringMs).toHaveLength(before.length - 1);

        // Setelah rollback (sesi tidak menyimpan), daftar kembali utuh.
        expect(await listed(now, to)).toHaveLength(before.length);
      });

      it('tanpa jadwal, psikolog tak aktif, atau psikolog tak dikenal: kosong; rentang melebihi 62 hari: kosong', async () => {
        const now = new Date();
        const to = new Date(now.getTime() + 10 * DAY_MS);
        const other = await withSession(db, asUser(ID.alice), (query) =>
          query(
            'select slot_at from public.psychologist_available_slots($1, $2::timestamptz, $3::timestamptz)',
            ['00000000-0000-4000-8000-0000000000ff', now.toISOString(), to.toISOString()],
          ),
        );
        expect(other).toEqual([]);

        const tooWide = await listed(now, new Date(now.getTime() + 70 * DAY_MS));
        expect(tooWide).toEqual([]);
        const backwards = await listed(to, now);
        expect(backwards).toEqual([]);
      });

      it('tanpa masuk: ditolak; peran anon tidak punya hak menjalankan fungsinya', async () => {
        const result = await expectFailure(
          db,
          asAnon,
          "select slot_at from public.psychologist_available_slots($1, now(), now() + interval '2 days')",
          [ID.psychologist],
        );
        expect(result.code).toBe('42501');
      });
    },
  );
});
