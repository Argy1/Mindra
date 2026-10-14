// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyCareMigration,
  applyHardeningMigration,
  applyIntegrityMigration,
  applyWebMigration,
  asAnon,
  asService,
  asUser,
  createBaseDatabase,
  expectFailure as expectFailureWithDb,
  hasCareMigration,
  hasHardeningMigration,
  hasIntegrityMigration,
  hasMigrations,
  readMigration,
  CARE_MIGRATION,
  withAal1,
  withSession,
  type Query,
  type Session,
} from './harness';

/**
 * Migrasi Fase 2 (20261014000300_care_ecosystem.sql): MFA di database, RPC daftar klien / pendamping /
 * riwayat akses, log_access_batch, catatan sesi, dan persetujuan SATUSEHAT. Skenario sah dulu, lalu penyerang.
 * Sesi pengguna bawaan memakai aal2 (TOTP terverifikasi); `withAal1` = hanya kata sandi.
 */
const CONSULTATION = '00000000-0000-4000-8000-0000000000c9';

describe.skipIf(
  !hasMigrations || !hasHardeningMigration || !hasIntegrityMigration || !hasCareMigration,
)('migrasi care_ecosystem (Fase 2)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyWebMigration(db);
    await applyHardeningMigration(db);
    await applyIntegrityMigration(db);
    await seedFixtures(db);
    await applyCareMigration(db);
    await db.exec(`
        insert into public.consultations (id, user_id, psychologist_id, scheduled_at, status)
        values ('${CONSULTATION}', '${ID.alice}', '${ID.psychologist}', now() + interval '1 day', 'confirmed');
      `);
  }, 90_000);

  afterAll(async () => {
    await db.close();
  });

  const expectFailure = (session: Session, sql: string, params?: unknown[]) =>
    expectFailureWithDb(db, session, sql, params);
  const run = <T = Record<string, unknown>>(session: Session, sql: string, params?: unknown[]) =>
    withSession(db, session, (q) => q<T>(sql, params));
  const count = async (session: Session, sql: string, params?: unknown[]) =>
    (await run<{ n: number }>(session, `select count(*)::int as n from (${sql}) t`, params))[0]!.n;

  async function switchTo(q: Query, s: Session) {
    await q('reset role');
    await q(`select set_config('request.jwt.claim.role', $1, true)`, [s.role]);
    await q(`select set_config('request.jwt.claim.sub', $1, true)`, [s.uid ?? '']);
    await q(`select set_config('request.jwt.claim.aal', $1, true)`, [
      s.aal ?? (s.role === 'authenticated' ? 'aal2' : ''),
    ]);
    await q(`set local role ${s.role}`);
  }

  const rina = asUser(ID.rina);
  const DATA_TABLES = ['assessments', 'mood_entries', 'sleep_entries'] as const;

  // =========================================================================
  describe('MFA di database: psikolog hanya membaca data klien dengan sesi aal2', () => {
    it.each(DATA_TABLES)('%s: aal2 terbaca, aal1 (hanya kata sandi) tidak', async (table) => {
      const sql = `select 1 from public.${table} where user_id = $1`;
      expect(await count(rina, sql, [ID.alice])).toBe(1);
      expect(await count(withAal1(rina), sql, [ID.alice])).toBe(0);
    });

    it('can_view dan log_access mengikuti: aal1 ditolak, aal2 diterima', async () => {
      const check = (s: Session) =>
        run<{ ok: boolean }>(s, `select public.can_view($1, 'assessments') as ok`, [ID.alice]);
      expect((await check(rina))[0]!.ok).toBe(true);
      expect((await check(withAal1(rina)))[0]!.ok).toBe(false);
      expect(
        (
          await expectFailure(
            withAal1(rina),
            `select public.log_access($1, 'assessments', 'read')`,
            [ID.alice],
          )
        ).code,
      ).toBe('42501');
    });

    it('alert krisis klien juga tidak terbaca di aal1', async () => {
      const created = await withSession(db, asService, async (q) => {
        await q(
          `insert into public.crisis_alerts (user_id, source, severity) values ($1, 'manual', 'high')`,
          [ID.alice],
        );
        await switchTo(q, rina);
        const aal2 = await q(`select 1 from public.crisis_alerts where user_id = $1`, [ID.alice]);
        await switchTo(q, withAal1(rina));
        const aal1 = await q(`select 1 from public.crisis_alerts where user_id = $1`, [ID.alice]);
        return { aal2: aal2.length, aal1: aal1.length };
      });
      expect(created).toEqual({ aal2: 1, aal1: 0 });
    });

    it('klaim aal kosong atau tidak dikenal diperlakukan sebagai aal1 (gagal tertutup)', async () => {
      for (const aal of ['', 'aal0', 'AAL2', 'aal3']) {
        const rows = await withSession(db, asService, async (q) => {
          await switchTo(q, rina);
          await q(`select set_config('request.jwt.claim.aal', $1, true)`, [aal]);
          return q(`select 1 from public.assessments where user_id = $1`, [ID.alice]);
        });
        expect(rows, aal).toEqual([]);
      }
    });

    it('pemilik data dan pendamping TIDAK terpengaruh oleh aturan MFA psikolog', async () => {
      expect(
        await count(
          withAal1(asUser(ID.alice)),
          `select 1 from public.assessments where user_id = $1`,
          [ID.alice],
        ),
      ).toBe(1);
      expect(
        await count(
          withAal1(asUser(ID.ibu)),
          `select 1 from public.mood_entries where user_id = $1`,
          [ID.alice],
        ),
      ).toBe(1);
    });

    it('sakelar demo app.psychologist_mfa = off membuka aal1; nilai lain tetap mewajibkan', async () => {
      const read = (setting: string) =>
        withSession(db, withAal1(rina), async (q) => {
          await q(`select set_config('app.psychologist_mfa', $1, true)`, [setting]);
          return q(`select 1 from public.assessments where user_id = $1`, [ID.alice]);
        });
      expect(await read('off')).toHaveLength(1);
      for (const setting of ['', 'on', 'OFF', 'false', 'no', 'required']) {
        expect(await read(setting), setting).toEqual([]);
      }
    });

    it('SERANGAN: akun lain dengan aal2 tetap tidak bisa membaca data tanpa care_link', async () => {
      expect(
        await count(asUser(ID.mallory), `select 1 from public.assessments where user_id = $1`, [
          ID.alice,
        ]),
      ).toBe(0);
    });
  });

  // =========================================================================
  describe('psychologist_clients()', () => {
    it('psikolog aal2 melihat klien aktifnya: hanya id, nama, tanggal tautan, dan izin', async () => {
      const rows = await run<Record<string, unknown>>(
        rina,
        `select * from public.psychologist_clients()`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ patient_id: ID.alice, name: 'Alice' });
      expect(Object.keys(rows[0]!).sort()).toEqual([
        'linked_at',
        'name',
        'patient_id',
        'permissions',
      ]);
    });

    it('aal1 mendapat daftar kosong, dan tautan yang dicabut tidak muncul', async () => {
      expect(await run(withAal1(rina), `select * from public.psychologist_clients()`)).toEqual([]);
      const afterRevoke = await withSession(db, asService, async (q) => {
        await q(`update public.care_links set status = 'revoked' where id = $1`, [ID.careLink]);
        await switchTo(q, rina);
        return q(`select * from public.psychologist_clients()`);
      });
      expect(afterRevoke).toEqual([]);
    });

    it('akun lain (pengguna, penyerang, pendamping) tidak mendapat apa pun; anon tidak bisa memanggil', async () => {
      for (const uid of [ID.alice, ID.mallory, ID.ibu]) {
        expect(await run(asUser(uid), `select * from public.psychologist_clients()`), uid).toEqual(
          [],
        );
      }
      expect(
        (await expectFailure(asAnon, `select * from public.psychologist_clients()`)).code,
      ).toBe('42501');
    });
  });

  // =========================================================================
  describe('patient_caregivers()', () => {
    it('pasien melihat pendampingnya dengan nama; kode undangan hanya untuk yang menunggu', async () => {
      const alice = await run<{
        caregiver_name: string;
        invite_code: string | null;
        status: string;
      }>(asUser(ID.alice), `select * from public.patient_caregivers()`);
      expect(alice).toHaveLength(1);
      expect(alice[0]).toMatchObject({
        caregiver_name: 'Ibu',
        status: 'active',
        invite_code: null,
      });

      const bob = await run<{
        invite_code: string | null;
        status: string;
        caregiver_name: string | null;
      }>(asUser(ID.bob), `select * from public.patient_caregivers()`);
      expect(bob).toHaveLength(1);
      expect(bob[0]).toMatchObject({
        status: 'pending',
        invite_code: 'PENDING1',
        caregiver_name: null,
      });
    });

    it('SERANGAN: tidak ada pasien yang melihat pendamping pasien lain', async () => {
      expect(await run(asUser(ID.mallory), `select * from public.patient_caregivers()`)).toEqual(
        [],
      );
      const ids = await run<{ id: string }>(
        asUser(ID.alice),
        `select id from public.patient_caregivers()`,
      );
      expect(ids.map((r) => r.id)).not.toContain(ID.bobInvite);
    });

    it('pendamping yang dicabut atau menolak tidak ditampilkan', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await q(`update public.caregiver_relationships set status = 'revoked' where id = $1`, [
          ID.aliceRelationship,
        ]);
        await switchTo(q, asUser(ID.alice));
        return q(`select * from public.patient_caregivers()`);
      });
      expect(rows).toEqual([]);
    });
  });

  // =========================================================================
  describe('my_access_log() dan log_access_batch()', () => {
    it('pasien melihat siapa yang membuka datanya, dengan nama lengkap psikolog', async () => {
      const rows = await withSession(db, rina, async (q) => {
        await q(`select public.log_access($1, 'assessments', 'read')`, [ID.alice]);
        await switchTo(q, asUser(ID.alice));
        return q<{ actor_name: string; resource: string; action: string; actor_role: string }>(
          `select * from public.my_access_log()`,
        );
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actor_name: 'Rina Sari, M.Psi.',
        resource: 'assessments',
        action: 'read',
        actor_role: 'psychologist',
      });
    });

    it('SERANGAN: riwayat orang lain tidak terbaca, dan log tidak bisa ditulis langsung', async () => {
      const rows = await withSession(db, rina, async (q) => {
        await q(`select public.log_access($1, 'assessments', 'read')`, [ID.alice]);
        await switchTo(q, asUser(ID.mallory));
        return q(`select * from public.my_access_log()`);
      });
      expect(rows).toEqual([]);
      expect(
        (
          await expectFailure(
            asUser(ID.mallory),
            `insert into public.data_access_logs (actor_id, subject_id, actor_role, resource) values ($1, $2, 'user', 'mood')`,
            [ID.mallory, ID.alice],
          )
        ).code,
      ).toBe('42501');
    });

    it('batas jumlah baris dijepit (limit 0 → 1, bukan galat)', async () => {
      const rows = await withSession(db, rina, async (q) => {
        await q(`select public.log_access($1, 'assessments', 'read')`, [ID.alice]);
        await q(`select public.log_access($1, 'mood', 'read')`, [ID.alice]);
        await switchTo(q, asUser(ID.alice));
        return q(`select * from public.my_access_log(0)`);
      });
      expect(rows).toHaveLength(1);
    });

    it('log_access_batch mencatat setiap klien; kosong tidak melakukan apa pun', async () => {
      const rows = await withSession(db, rina, async (q) => {
        await q(`select public.log_access_batch(array[$1]::uuid[], 'mood', 'read')`, [ID.alice]);
        await q(`select public.log_access_batch(array[]::uuid[], 'mood', 'read')`);
        await q(`select public.log_access_batch(null, 'mood', 'read')`);
        await switchTo(q, asUser(ID.alice));
        return q(`select resource from public.my_access_log()`);
      });
      expect(rows).toEqual([{ resource: 'mood' }]);
    });

    it('SERANGAN: satu subjek yang tidak berhak menggagalkan SELURUH panggilan', async () => {
      const failure = await expectFailure(
        rina,
        `select public.log_access_batch(array[$1, $2]::uuid[], 'mood', 'read')`,
        [ID.alice, ID.mallory],
      );
      expect(failure.code).toBe('42501');
      expect(
        (
          await expectFailure(
            asUser(ID.mallory),
            `select public.log_access_batch(array[$1]::uuid[], 'mood', 'read')`,
            [ID.alice],
          )
        ).code,
      ).toBe('42501');
      expect(
        (
          await expectFailure(
            withAal1(rina),
            `select public.log_access_batch(array[$1]::uuid[], 'mood', 'read')`,
            [ID.alice],
          )
        ).code,
      ).toBe('42501');
    });

    it('lebih dari 200 subjek ditolak (cegah beban dan penyalahgunaan)', async () => {
      const failure = await expectFailure(
        rina,
        `select public.log_access_batch(array(select gen_random_uuid() from generate_series(1, 201)), 'mood', 'read')`,
      );
      expect(failure.code).toBe('22023');
    });
  });

  // =========================================================================
  describe('catatan sesi (consultations)', () => {
    it('psikolog aal2 melihat konsultasinya dan boleh mengisi catatan sesi', async () => {
      const rows = await run<{ session_summary: string; notes_for_patient: string }>(
        rina,
        `update public.consultations
              set session_summary = 'Klien membahas tidur.', notes_for_patient = 'Coba jadwal tidur tetap.'
            where id = $1 returning session_summary, notes_for_patient`,
        [CONSULTATION],
      );
      expect(rows).toEqual([
        { session_summary: 'Klien membahas tidur.', notes_for_patient: 'Coba jadwal tidur tetap.' },
      ]);
    });

    it('aal1 tidak melihat dan tidak bisa mengubah konsultasi', async () => {
      expect(
        await count(withAal1(rina), `select 1 from public.consultations where id = $1`, [
          CONSULTATION,
        ]),
      ).toBe(0);
      const rows = await run(
        withAal1(rina),
        `update public.consultations set session_summary = 'x' where id = $1 returning id`,
        [CONSULTATION],
      );
      expect(rows).toEqual([]);
    });

    it.each([
      ["status = 'cancelled'", `status = 'cancelled'`],
      ['jadwal diubah', `scheduled_at = now() + interval '30 days'`],
      ['biaya diubah', `booking_fee = 1`],
      ['dipindah ke pasien lain', `user_id = '${ID.mallory}'`],
      ['token video diubah', `agora_token = 'x'`],
    ])('SERANGAN psikolog: %s ditolak penjaga', async (_name, assignment) => {
      const failure = await expectFailure(
        rina,
        `update public.consultations set ${assignment} where id = $1`,
        [CONSULTATION],
      );
      expect(failure.code).toBe('42501');
    });

    it('penyerang tidak melihat atau mengubah konsultasi orang lain', async () => {
      expect(await count(asUser(ID.mallory), `select 1 from public.consultations`)).toBe(0);
      expect(
        await run(
          asUser(ID.mallory),
          `update public.consultations set session_summary = 'x' returning id`,
        ),
      ).toEqual([]);
    });

    it('pasien pemilik tetap boleh membatalkan konsultasinya (alur Flutter tidak berubah)', async () => {
      const rows = await run(
        asUser(ID.alice),
        `update public.consultations set status = 'cancelled' where id = $1 returning status`,
        [CONSULTATION],
      );
      expect(rows).toEqual([{ status: 'cancelled' }]);
    });
  });

  // =========================================================================
  describe('persetujuan SATUSEHAT', () => {
    it('bawaan mati; pengguna boleh menyalakan miliknya sendiri', async () => {
      const [before] = await run<{ satusehat_consent: boolean }>(
        asUser(ID.alice),
        `select satusehat_consent from public.profiles where id = $1`,
        [ID.alice],
      );
      expect(before!.satusehat_consent).toBe(false);
      const rows = await run(
        asUser(ID.alice),
        `update public.profiles set satusehat_consent = true where id = $1 returning satusehat_consent`,
        [ID.alice],
      );
      expect(rows).toEqual([{ satusehat_consent: true }]);
    });

    it('SERANGAN: tidak bisa mengubah persetujuan orang lain; kolom istimewa tetap terkunci', async () => {
      expect(
        await run(
          asUser(ID.mallory),
          `update public.profiles set satusehat_consent = true where id = $1 returning id`,
          [ID.alice],
        ),
      ).toEqual([]);
      expect(
        (
          await expectFailure(
            asUser(ID.mallory),
            `update public.profiles set role = 'admin' where id = $1`,
            [ID.mallory],
          )
        ).code,
      ).toBe('42501');
    });
  });

  // =========================================================================
  describe('meta: invarian migrasi Fase 2', () => {
    const priv = async (fn: string) =>
      (
        await run<{ anon: boolean; authed: boolean }>(
          asService,
          `select has_function_privilege('anon', 'public.${fn}', 'execute') as anon,
                    has_function_privilege('authenticated', 'public.${fn}', 'execute') as authed`,
        )
      )[0]!;

    it('RPC: anon tidak bisa, authenticated bisa', async () => {
      for (const fn of [
        'psychologist_mfa_ok()',
        'psychologist_clients()',
        'patient_caregivers()',
        'my_access_log(integer)',
        'log_access_batch(uuid[],text,text)',
        'can_view(uuid,text)',
      ]) {
        expect(await priv(fn), fn).toEqual({ anon: false, authed: true });
      }
    });

    it('fungsi trigger penjaga konsultasi tidak bisa dipanggil sebagai RPC', async () => {
      expect(await priv('consultations_guard_staff_update()')).toEqual({
        anon: false,
        authed: false,
      });
    });

    it('semua fungsi security definer ber-search_path kosong; semua tabel ber-RLS', async () => {
      expect(
        await run(
          asService,
          `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosecdef
                and not coalesce(p.proconfig @> array['search_path=""'], false)`,
        ),
      ).toEqual([]);
      expect(
        await run(
          asService,
          `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
        ),
      ).toEqual([]);
    });

    it('idempotent: memuat ulang tidak error dan tidak menggandakan policy', async () => {
      const countPolicies = async () =>
        (
          await run<{ n: number }>(
            asService,
            `select count(*)::int n from pg_policies where schemaname = 'public'`,
          )
        )[0]!.n;
      const before = await countPolicies();
      await applyCareMigration(db);
      expect(await countPolicies()).toBe(before);
    });

    it('hanya menambah: tidak ada drop table/column/policy, rename, truncate, atau delete', () => {
      const sql = readMigration(CARE_MIGRATION)
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');
      expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function|type|index|extension)\b/i);
      expect(sql).not.toMatch(/\btruncate\b|\brename\b|\bdelete\s+from\b/i);
      // Satu-satunya drop policy adalah pasangan drop-then-create untuk policy milik migrasi ini.
      const dropped = [...sql.matchAll(/drop\s+policy\s+if\s+exists\s+"([^"]+)"/gi)].map(
        (m) => m[1],
      );
      expect(new Set(dropped)).toEqual(
        new Set([
          'Linked psychologists view consultations',
          'Linked psychologists write session notes',
        ]),
      );
    });
  });
});
