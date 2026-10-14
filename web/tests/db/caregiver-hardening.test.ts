// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyHardeningMigration,
  applyWebMigration,
  asAnon,
  asService,
  asUser,
  createBaseDatabase,
  expectFailure as expectFailureWithDb,
  hasHardeningMigration,
  hasMigrations,
  HARDENING_MIGRATION,
  readMigration,
  withSession,
  type Query,
  type Session,
} from './harness';

/**
 * Menguji 20261014000100_caregiver_invite_hardening.sql: menutup F1 (undangan bisa dibaca dan
 * diambil alih), F3 (pendamping membaca seluruh profil pasien), F4 (declineInvite gagal), dan F8
 * (kode undangan dari jam). Skenario sah dulu, lalu skenario penyerang (Mallory).
 */
describe.skipIf(!hasMigrations || !hasHardeningMigration)(
  'pengerasan undangan pendamping (F1, F3, F4, F8)',
  () => {
    let db: PGlite;

    beforeAll(async () => {
      db = await createBaseDatabase();
      await applyWebMigration(db);
      await seedFixtures(db);
      await applyHardeningMigration(db);
    }, 90_000);

    afterAll(async () => {
      await db.close();
    });

    const expectFailure = (session: Session, sql: string, params?: unknown[]) =>
      expectFailureWithDb(db, session, sql, params);
    const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
      withSession(db, session, (q) => q<T>(sql, params));
    const count = async (session: Session, sql: string, params?: unknown[]) =>
      (await run<{ n: number }>(session, `select count(*)::int as n from (${sql}) t`, params))[0]!
        .n;

    async function switchTo(q: Query, s: Session) {
      await q('reset role');
      await q(`select set_config('request.jwt.claim.role', $1, true)`, [s.role]);
      await q(`select set_config('request.jwt.claim.sub', $1, true)`, [s.uid ?? '']);
      await q(`set local role ${s.role}`);
    }

    type Relationship = {
      id: string;
      patient_id: string;
      caregiver_id: string | null;
      status: string;
      permissions: Record<string, boolean>;
    };
    const accept = (q: Query, code: string) =>
      q<{ r: Relationship | null }>(`select public.accept_caregiver_invite($1) as r`, [code]).then(
        (rows) => rows[0]!.r,
      );
    const decline = (q: Query, code: string) =>
      q<{ r: boolean }>(`select public.decline_caregiver_invite($1) as r`, [code]).then(
        (rows) => rows[0]!.r,
      );
    const statusOf = async (q: Query, id: string) => {
      await switchTo(q, asService);
      const [row] = await q<{ status: string; caregiver_id: string | null }>(
        `select status, caregiver_id from public.caregiver_relationships where id = $1`,
        [id],
      );
      return row;
    };

    // =========================================================================
    describe('F1: undangan milik orang lain tidak terbaca dan tidak bisa diubah', () => {
      it('penyerang tidak melihat satu pun undangan, bahkan yang berstatus pending', async () => {
        expect(
          await count(asUser(ID.mallory), `select 1 from public.caregiver_relationships`),
        ).toBe(0);
      });

      it('alur lama Flutter (select kode + status pending) tidak lagi menemukan apa pun', async () => {
        const rows = await run(
          asUser(ID.ibu),
          `select * from public.caregiver_relationships where invite_code = 'PENDING1' and status = 'pending'`,
        );
        expect(rows).toEqual([]);
      });

      it('pihak terkait tetap melihat barisnya sendiri', async () => {
        expect(await count(asUser(ID.bob), `select 1 from public.caregiver_relationships`)).toBe(1);
        expect(await count(asUser(ID.alice), `select 1 from public.caregiver_relationships`)).toBe(
          1,
        );
        // Ibu hanya melihat hubungan aktifnya dengan Alice, bukan undangan Bob.
        expect(await count(asUser(ID.ibu), `select 1 from public.caregiver_relationships`)).toBe(1);
      });

      it('SERANGAN: UPDATE langsung ke undangan orang lain tidak mengenai baris apa pun', async () => {
        const result = await withSession(db, asUser(ID.mallory), async (q) => {
          const updated = await q(
            `update public.caregiver_relationships set caregiver_id = $1, status = 'active' where id = $2 returning id`,
            [ID.mallory, ID.bobInvite],
          );
          return { updated, after: await statusOf(q, ID.bobInvite) };
        });
        expect(result.updated).toEqual([]);
        expect(result.after).toEqual({ status: 'pending', caregiver_id: null });
      });

      it('SERANGAN: tidak bisa menghapus hubungan orang lain', async () => {
        const rows = await run(
          asUser(ID.mallory),
          `delete from public.caregiver_relationships where id = $1 returning id`,
          [ID.aliceRelationship],
        );
        expect(rows).toEqual([]);
      });
    });

    // =========================================================================
    describe('accept_caregiver_invite', () => {
      it('menerima undangan dengan kode yang tepat (huruf kecil dan spasi dinormalkan)', async () => {
        const row = await withSession(db, asUser(ID.ibu), (q) => accept(q, '  pending1 '));
        expect(row).toMatchObject({
          id: ID.bobInvite,
          patient_id: ID.bob,
          caregiver_id: ID.ibu,
          status: 'active',
        });
      });

      it('izin yang berlaku adalah pilihan PASIEN, tidak bisa dinaikkan penerima', async () => {
        const result = await withSession(db, asUser(ID.ibu), async (q) => {
          const row = await accept(q, 'PENDING1');
          const [view] = await q<{ mood: boolean; assessments: boolean }>(
            `select public.can_view($1, 'mood') as mood, public.can_view($1, 'assessments') as assessments`,
            [ID.bob],
          );
          return { permissions: row!.permissions, view };
        });
        expect(result.permissions).toEqual({
          mood_daily: true,
          assessment_results: false,
          app_activity: false,
          emergency_alerts: true,
        });
        expect(result.view).toEqual({ mood: true, assessments: false });
      });

      it('kode salah, terlalu pendek, atau kosong menghasilkan null yang sama (tidak membocorkan apa pun)', async () => {
        const results = await withSession(db, asUser(ID.mallory), async (q) => [
          await accept(q, 'ZZZZZZZZ'),
          await accept(q, 'AB'),
          await accept(q, ''),
        ]);
        expect(results).toEqual([null, null, null]);
      });

      it('SERANGAN: pasien tidak bisa menerima undangannya sendiri', async () => {
        const row = await withSession(db, asUser(ID.bob), (q) => accept(q, 'PENDING1'));
        expect(row).toBeNull();
      });

      it('undangan tidak bisa diterima dua kali', async () => {
        const second = await withSession(db, asUser(ID.ibu), async (q) => {
          await accept(q, 'PENDING1');
          await switchTo(q, asUser(ID.mallory));
          return accept(q, 'PENDING1');
        });
        expect(second).toBeNull();
      });

      it('undangan yang sudah ditolak atau dicabut tidak bisa diterima', async () => {
        for (const status of ['declined', 'revoked']) {
          const row = await withSession(db, asService, async (q) => {
            await q(`update public.caregiver_relationships set status = $1 where id = $2`, [
              status,
              ID.bobInvite,
            ]);
            await switchTo(q, asUser(ID.ibu));
            return accept(q, 'PENDING1');
          });
          expect(row, status).toBeNull();
        }
      });

      it('undangan kedaluwarsa setelah 14 hari: 15 hari ditolak, 13 hari diterima', async () => {
        const result = await withSession(db, asService, async (q) => {
          await q(
            `insert into public.caregiver_relationships (patient_id, invite_code, status, created_at) values
               ($1, 'OLDCODE1', 'pending', now() - interval '15 days'),
               ($1, 'NEWCODE1', 'pending', now() - interval '13 days')`,
            [ID.alice],
          );
          await switchTo(q, asUser(ID.mallory));
          const old = await accept(q, 'OLDCODE1');
          const fresh = await accept(q, 'NEWCODE1');
          return { old, fresh };
        });
        expect(result.old).toBeNull();
        expect(result.fresh).toMatchObject({ status: 'active', caregiver_id: ID.mallory });
      });

      it('SERANGAN: menebak kode dibatasi 5 percobaan gagal per 15 menit, walau tebakan ke-6 benar', async () => {
        const outcome = await withSession(db, asUser(ID.mallory), async (q) => {
          for (const guess of ['AAAAAAAA', 'BBBBBBBB', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE']) {
            expect(await accept(q, guess)).toBeNull();
          }
          try {
            await accept(q, 'PENDING1');
            return 'DITERIMA (BURUK)';
          } catch (error) {
            return (error as Error).message;
          }
        });
        expect(outcome).toMatch(/Terlalu banyak percobaan/);
      });

      it('pembatasan berlaku per akun: akun lain tidak ikut terkunci', async () => {
        const row = await withSession(db, asUser(ID.mallory), async (q) => {
          for (const guess of ['AAAAAAAA', 'BBBBBBBB', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE']) {
            await accept(q, guess);
          }
          await switchTo(q, asUser(ID.ibu));
          return accept(q, 'PENDING1');
        });
        expect(row).toMatchObject({ status: 'active' });
      });

      it('percobaan gagal dari accept dan decline dihitung bersama', async () => {
        const outcome = await withSession(db, asUser(ID.mallory), async (q) => {
          await accept(q, 'AAAAAAAA');
          await accept(q, 'BBBBBBBB');
          await accept(q, 'CCCCCCCC');
          await decline(q, 'DDDDDDDD');
          await decline(q, 'EEEEEEEE');
          try {
            await decline(q, 'PENDING1');
            return 'DITOLAK DIIZINKAN (BURUK)';
          } catch (error) {
            return (error as Error).message;
          }
        });
        expect(outcome).toMatch(/Terlalu banyak percobaan/);
      });

      it('SERANGAN: pengguna tidak bisa membaca atau mengosongkan catatan percobaannya', async () => {
        for (const sql of [
          `select * from public.caregiver_invite_attempts`,
          `delete from public.caregiver_invite_attempts`,
          `insert into public.caregiver_invite_attempts (user_id) values ('${ID.mallory}')`,
        ]) {
          expect((await expectFailure(asUser(ID.mallory), sql)).code, sql).toBe('42501');
        }
      });

      it('anon tidak bisa memanggil RPC', async () => {
        expect(
          (await expectFailure(asAnon, `select public.accept_caregiver_invite('PENDING1')`)).code,
        ).toBe('42501');
        expect(
          (await expectFailure(asAnon, `select public.decline_caregiver_invite('PENDING1')`)).code,
        ).toBe('42501');
      });
    });

    // =========================================================================
    describe('F4: menolak undangan (decline_caregiver_invite)', () => {
      it('penerima menolak undangan dengan kode yang tepat', async () => {
        const result = await withSession(db, asUser(ID.ibu), async (q) => {
          const ok = await decline(q, 'pending1');
          return { ok, row: await statusOf(q, ID.bobInvite) };
        });
        expect(result.ok).toBe(true);
        expect(result.row).toEqual({ status: 'declined', caregiver_id: null });
      });

      it('undangan yang ditolak tidak bisa diterima lagi', async () => {
        const row = await withSession(db, asUser(ID.ibu), async (q) => {
          await decline(q, 'PENDING1');
          return accept(q, 'PENDING1');
        });
        expect(row).toBeNull();
      });

      it('kode salah menghasilkan false; pasien tidak bisa menolak undangannya sendiri', async () => {
        expect(await withSession(db, asUser(ID.ibu), (q) => decline(q, 'ZZZZZZZZ'))).toBe(false);
        expect(await withSession(db, asUser(ID.bob), (q) => decline(q, 'PENDING1'))).toBe(false);
      });
    });

    // =========================================================================
    describe('F8: kode undangan dibuat server, bukan klien', () => {
      const CODE_FORMAT = /^[A-HJ-NP-Z2-9]{8}$/;

      it('kode, status, caregiver_id, dan created_at kiriman klien diabaikan', async () => {
        const [row] = await run<{
          invite_code: string;
          status: string;
          caregiver_id: string | null;
          fresh: boolean;
        }>(
          asUser(ID.alice),
          `insert into public.caregiver_relationships
             (id, patient_id, caregiver_phone, invite_code, status, caregiver_id, created_at)
           values (gen_random_uuid(), $1, '0812', 'AAAAAAAA', 'active', $2, '2020-01-01T00:00:00Z')
           returning invite_code, status, caregiver_id, created_at > now() - interval '1 minute' as fresh`,
          [ID.alice, ID.ibu],
        );
        expect(row!.invite_code).not.toBe('AAAAAAAA');
        expect(row!.invite_code).toMatch(CODE_FORMAT);
        expect(row).toMatchObject({ status: 'pending', caregiver_id: null, fresh: true });
      });

      it('200 undangan dalam satu pernyataan (waktu yang sama) menghasilkan 200 kode berbeda dan merata', async () => {
        const rows = await run<{ invite_code: string }>(
          asUser(ID.alice),
          `insert into public.caregiver_relationships (id, patient_id, invite_code)
             select gen_random_uuid(), $1, 'TMP' || g from generate_series(1, 200) g
           returning invite_code`,
          [ID.alice],
        );
        const codes = rows.map((r) => r.invite_code);
        expect(new Set(codes).size).toBe(200);
        for (const code of codes) expect(code).toMatch(CODE_FORMAT);

        // Kode yang diturunkan dari jam akan berulang pada milidetik yang sama; sumber acak tidak.
        // Setiap dari 32 simbol harus muncul (peluang gagal ~ 1e-21) dan tidak ada yang mendominasi.
        const frequency = new Map<string, number>();
        for (const symbol of codes.join(''))
          frequency.set(symbol, (frequency.get(symbol) ?? 0) + 1);
        expect(frequency.size).toBe(32);
        expect(Math.max(...frequency.values())).toBeLessThan(100); // rata-rata 50
        expect(Math.min(...frequency.values())).toBeGreaterThan(15);
      });

      it('service_role (seed, migrasi) boleh menentukan kode sendiri', async () => {
        const [row] = await run<{ invite_code: string }>(
          asService,
          `insert into public.caregiver_relationships (patient_id, invite_code, status)
           values ($1, 'SEEDCODE', 'pending') returning invite_code`,
          [ID.alice],
        );
        expect(row!.invite_code).toBe('SEEDCODE');
      });

      it('SERANGAN: tidak bisa membuat undangan atas nama pasien lain', async () => {
        const failure = await expectFailure(
          asUser(ID.mallory),
          `insert into public.caregiver_relationships (patient_id, invite_code) values ($1, 'XXXXXXXX')`,
          [ID.alice],
        );
        expect(failure.message).toMatch(/row-level security/);
      });

      it('undangan baru oleh pasien bisa langsung diterima dengan kodenya (alur lengkap)', async () => {
        const result = await withSession(db, asUser(ID.alice), async (q) => {
          const [created] = await q<{ invite_code: string }>(
            `insert into public.caregiver_relationships (patient_id, invite_code, caregiver_phone, permissions)
             values ($1, 'IGNORED1', '0812', '{"mood_daily":true,"assessment_results":true,"app_activity":false,"emergency_alerts":true}')
             returning invite_code`,
            [ID.alice],
          );
          await switchTo(q, asUser(ID.mallory));
          return accept(q, created!.invite_code);
        });
        expect(result).toMatchObject({ patient_id: ID.alice, caregiver_id: ID.mallory });
        expect(result!.permissions.assessment_results).toBe(true);
      });
    });

    // =========================================================================
    describe('F3: pendamping tidak lagi membaca seluruh baris profil pasien', () => {
      it('pendamping aktif tidak melihat baris profil pasien (email, tanggal lahir, nik)', async () => {
        expect(
          await count(asUser(ID.ibu), `select 1 from public.profiles where id = $1`, [ID.alice]),
        ).toBe(0);
        expect(await count(asUser(ID.ibu), `select 1 from public.profiles`)).toBe(1);
      });

      it('caregiver_patient_names() mengembalikan HANYA id dan nama pasien aktif', async () => {
        const rows = await run<Record<string, unknown>>(
          asUser(ID.ibu),
          `select * from public.caregiver_patient_names()`,
        );
        expect(rows).toEqual([{ patient_id: ID.alice, name: 'Alice' }]);
        expect(Object.keys(rows[0]!)).toEqual(['patient_id', 'name']);
      });

      it('akun tanpa hubungan, dan pendamping yang sudah dicabut, mendapat daftar kosong', async () => {
        expect(
          await run(asUser(ID.mallory), `select * from public.caregiver_patient_names()`),
        ).toEqual([]);
        const afterRevoke = await withSession(db, asService, async (q) => {
          await q(`update public.caregiver_relationships set status = 'revoked' where id = $1`, [
            ID.aliceRelationship,
          ]);
          await switchTo(q, asUser(ID.ibu));
          return q(`select * from public.caregiver_patient_names()`);
        });
        expect(afterRevoke).toEqual([]);
      });

      it('izin data tetap berfungsi: mood terbaca, asesmen (izin mati) tidak', async () => {
        expect(
          await count(asUser(ID.ibu), `select 1 from public.mood_entries where user_id = $1`, [
            ID.alice,
          ]),
        ).toBe(1);
        expect(
          await count(asUser(ID.ibu), `select 1 from public.assessments where user_id = $1`, [
            ID.alice,
          ]),
        ).toBe(0);
      });

      it('pengguna tetap membaca dan mengubah profilnya sendiri', async () => {
        const rows = await run(
          asUser(ID.alice),
          `update public.profiles set name = 'Alice B' where id = $1 returning name`,
          [ID.alice],
        );
        expect(rows).toEqual([{ name: 'Alice B' }]);
      });
    });

    // =========================================================================
    describe('penjaga UPDATE tetap berlaku di bawah policy baru', () => {
      it('pasien tetap bebas mengubah izin dan mencabut', async () => {
        const rows = await run(
          asUser(ID.alice),
          `update public.caregiver_relationships
              set permissions = '{"mood_daily":false,"assessment_results":true,"app_activity":false,"emergency_alerts":true}'
            where id = $1 returning status`,
          [ID.aliceRelationship],
        );
        expect(rows).toEqual([{ status: 'active' }]);
      });

      it('SERANGAN: pendamping aktif tidak bisa menaikkan izinnya sendiri', async () => {
        const failure = await expectFailure(
          asUser(ID.ibu),
          `update public.caregiver_relationships
              set permissions = '{"mood_daily":true,"assessment_results":true,"app_activity":true,"emergency_alerts":true}'
            where id = $1`,
          [ID.aliceRelationship],
        );
        expect(failure.code).toBe('42501');
      });

      it('pendamping aktif boleh mundur sendiri, tetapi tidak bisa mengaktifkan dirinya lagi', async () => {
        const result = await withSession(db, asUser(ID.ibu), async (q) => {
          const stepped = await q(
            `update public.caregiver_relationships set status = 'revoked' where id = $1 returning status`,
            [ID.aliceRelationship],
          );
          try {
            await q(`update public.caregiver_relationships set status = 'active' where id = $1`, [
              ID.aliceRelationship,
            ]);
            return { stepped, reactivation: 'DIIZINKAN (BURUK)' };
          } catch (error) {
            return { stepped, reactivation: (error as { code?: string }).code };
          }
        });
        expect(result.stepped).toEqual([{ status: 'revoked' }]);
        expect(result.reactivation).toBe('42501');
      });
    });

    // =========================================================================
    describe('penjaga aman NULL (sesi tanpa klaim JWT seperti SQL Editor)', () => {
      it('sesi tanpa JWT boleh mengubah izin (versi lama salah memblokirnya)', async () => {
        await db.transaction(async (tx) => {
          const result = await tx.query(
            `update public.caregiver_relationships
                set permissions = '{"mood_daily":false,"assessment_results":false,"app_activity":false,"emergency_alerts":false}'
              where id = $1 returning id`,
            [ID.aliceRelationship],
          );
          expect(result.rows).toHaveLength(1);
          await tx.rollback();
        });
      });

      it('regresi: tanpa migrasi pengerasan, sesi tanpa JWT memang diblokir (bug yang diperbaiki)', async () => {
        const old = await createBaseDatabase();
        try {
          await applyWebMigration(old);
          await seedFixtures(old);
          await old.transaction(async (tx) => {
            await expect(
              tx.query(
                `update public.caregiver_relationships set permissions = '{"mood_daily":false}' where id = $1`,
                [ID.aliceRelationship],
              ),
            ).rejects.toMatchObject({ code: '42501' });
            await tx.rollback();
          });
        } finally {
          await old.close();
        }
      }, 60_000);
    });

    // =========================================================================
    describe('meta: invarian migrasi pengerasan', () => {
      const privilege = async (fn: string) =>
        (
          await run<{ anon: boolean; authed: boolean }>(
            asService,
            `select has_function_privilege('anon', 'public.${fn}', 'execute') as anon,
                    has_function_privilege('authenticated', 'public.${fn}', 'execute') as authed`,
          )
        )[0]!;

      it('RPC: anon tidak bisa, authenticated bisa', async () => {
        for (const fn of [
          'accept_caregiver_invite(text)',
          'decline_caregiver_invite(text)',
          'caregiver_patient_names()',
        ]) {
          expect(await privilege(fn), fn).toEqual({ anon: false, authed: true });
        }
      });

      it('fungsi trigger dan pembantu tidak bisa dipanggil sebagai RPC', async () => {
        for (const fn of [
          'check_caregiver_invite_throttle(uuid)',
          'caregiver_relationships_assign_invite_code()',
          'caregiver_relationships_guard_update()',
        ]) {
          expect(await privilege(fn), fn).toEqual({ anon: false, authed: false });
        }
      });

      it('semua fungsi security definer ber-search_path kosong; semua tabel ber-RLS', async () => {
        const unsafe = await run(
          asService,
          `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef
              and not coalesce(p.proconfig @> array['search_path=""'], false)`,
        );
        expect(unsafe).toEqual([]);
        const open = await run(
          asService,
          `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
        );
        expect(open).toEqual([]);
      });

      it('tabel percobaan: RLS aktif, tanpa policy, dan tanpa hak tabel untuk anon/authenticated', async () => {
        const [row] = await run<{
          policies: number;
          anon_select: boolean;
          authed_select: boolean;
          authed_insert: boolean;
        }>(
          asService,
          `select (select count(*)::int from pg_policies where tablename = 'caregiver_invite_attempts') as policies,
                  has_table_privilege('anon', 'public.caregiver_invite_attempts', 'select') as anon_select,
                  has_table_privilege('authenticated', 'public.caregiver_invite_attempts', 'select') as authed_select,
                  has_table_privilege('authenticated', 'public.caregiver_invite_attempts', 'insert') as authed_insert`,
        );
        expect(row).toEqual({
          policies: 0,
          anon_select: false,
          authed_select: false,
          authed_insert: false,
        });
      });

      it('policy lama yang berbahaya sudah tiada, dan policy baru hanya untuk authenticated', async () => {
        const policies = await run<{ policyname: string; tablename: string; roles: string }>(
          asService,
          `select policyname, tablename, roles::text from pg_policies
            where tablename in ('caregiver_relationships', 'profiles')`,
        );
        const names = policies.map((p) => p.policyname);
        expect(names).not.toContain('View own or pending caregiver relationships');
        expect(names).not.toContain('Caregiver or patient can update relationship');
        expect(names).not.toContain('Caregivers can view patient profile');
        for (const name of [
          'View own caregiver relationships',
          'Parties update own caregiver relationship',
        ]) {
          expect(policies.find((p) => p.policyname === name)?.roles).toBe('{authenticated}');
        }
      });

      it('idempotent: menjalankan ulang tidak error dan tidak menggandakan policy', async () => {
        const countPolicies = async () =>
          (
            await run<{ n: number }>(
              asService,
              `select count(*)::int n from pg_policies where schemaname = 'public'`,
            )
          )[0]!.n;
        const before = await countPolicies();
        await applyHardeningMigration(db);
        expect(await countPolicies()).toBe(before);
      });

      it('tidak menghapus tabel/kolom/data dan hanya menghapus policy yang disebut', () => {
        const sql = readMigration(HARDENING_MIGRATION)
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n');
        expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|type|index|extension)\b/i);
        expect(sql).not.toMatch(/\btruncate\b/i);
        expect(sql).not.toMatch(/\brename\b/i);
        expect(sql).not.toMatch(/alter\s+column\s+\w+\s+type\b/i);
        // Satu-satunya DELETE: membersihkan catatan percobaan lama.
        const deletes = [...sql.matchAll(/delete\s+from\s+([\w.]+)/gi)].map((m) => m[1]);
        expect(new Set(deletes)).toEqual(new Set(['public.caregiver_invite_attempts']));
        const dropped = [...sql.matchAll(/drop\s+policy\s+if\s+exists\s+"([^"]+)"/gi)].map(
          (m) => m[1],
        );
        expect(new Set(dropped)).toEqual(
          new Set([
            'View own or pending caregiver relationships',
            'View own caregiver relationships',
            'Caregiver or patient can update relationship',
            'Parties update own caregiver relationship',
            'Caregivers can view patient profile',
          ]),
        );
      });
    });
  },
);
