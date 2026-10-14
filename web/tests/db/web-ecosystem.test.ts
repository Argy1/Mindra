// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID, seedFixtures } from './fixtures';
import {
  applyWebMigration,
  asAnon,
  asService,
  asUser,
  createBaseDatabase,
  expectFailure as expectFailureWithDb,
  hasMigrations,
  readMigration,
  WEB_MIGRATION,
  withSession,
  type Query,
  type Session,
} from './harness';

/**
 * Menguji migrasi 20261014000000_web_ecosystem.sql pada Postgres sungguhan (PGlite), dengan
 * meniru role + klaim JWT Supabase. Setiap tes dijalankan dalam transaksi yang di-rollback.
 * Pola penamaan: skenario sah dulu, lalu skenario penyerang.
 */
describe.skipIf(!hasMigrations)('migrasi web_ecosystem (RLS, trigger, fungsi)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyWebMigration(db);
    await seedFixtures(db);
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

  /** Pindah identitas di tengah transaksi (mis. siapkan data sebagai sistem, lalu uji sebagai pengguna). */
  async function switchTo(q: Query, s: Session) {
    await q('reset role');
    await q(`select set_config('request.jwt.claim.role', $1, true)`, [s.role]);
    await q(`select set_config('request.jwt.claim.sub', $1, true)`, [s.uid ?? '']);
    await q(`set local role ${s.role}`);
  }

  // ===========================================================================
  describe('profiles: kolom istimewa terkunci', () => {
    it('pengguna boleh mengubah nama sendiri', async () => {
      const rows = await run(
        asUser(ID.alice),
        `update public.profiles set name = 'Alice B' where id = $1 returning name`,
        [ID.alice],
      );
      expect(rows).toEqual([{ name: 'Alice B' }]);
    });

    it('pengguna TIDAK bisa menaikkan role-nya sendiri', async () => {
      const failure = await expectFailure(
        asUser(ID.alice),
        `update public.profiles set role = 'admin' where id = $1`,
        [ID.alice],
      );
      expect(failure.code).toBe('42501');
    });

    it('upsert untuk menaikkan role tidak berefek: trigger INSERT menormalkan role sebelum ON CONFLICT membacanya', async () => {
      const rows = await run<{ role: string }>(
        asUser(ID.alice),
        `insert into public.profiles (id, email, role) values ($1, 'alice@t.test', 'admin')
         on conflict (id) do update set role = excluded.role returning role`,
        [ID.alice],
      );
      expect(rows).toEqual([{ role: 'user' }]);
    });

    it('is_demo dan requested_role ikut terkunci', async () => {
      expect(
        (
          await expectFailure(
            asUser(ID.alice),
            `update public.profiles set is_demo = true where id = $1`,
            [ID.alice],
          )
        ).code,
      ).toBe('42501');
      expect(
        (
          await expectFailure(
            asUser(ID.alice),
            `update public.profiles set requested_role = 'psychologist' where id = $1`,
            [ID.alice],
          )
        ).code,
      ).toBe('42501');
    });

    it('menyisipkan profil sendiri tidak bisa menyelundupkan role (dipaksa "user")', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await q(`delete from public.profiles where id = $1`, [ID.mallory]);
        await switchTo(q, asUser(ID.mallory));
        return q<{ role: string; is_demo: boolean }>(
          `insert into public.profiles (id, email, role, is_demo) values ($1, 'm@t.test', 'admin', true) returning role, is_demo`,
          [ID.mallory],
        );
      });
      expect(rows).toEqual([{ role: 'user', is_demo: false }]);
    });

    it('service_role boleh mengubah role, dan klaim JWT (app_metadata) ikut diperbarui', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await q(`update public.profiles set role = 'psychologist' where id = $1`, [ID.bob]);
        return q<{ role: string | null }>(
          `select raw_app_meta_data ->> 'role' as role from auth.users where id = $1`,
          [ID.bob],
        );
      });
      expect(rows).toEqual([{ role: 'psychologist' }]);
    });

    it('BUKTI alasan desain: REVOKE UPDATE (role) saja TIDAK mencegah eskalasi, trigger-lah yang mencegah', async () => {
      const outcome = await withSession(db, asService, async (q) => {
        await q('reset role');
        await q(`alter table public.profiles disable trigger trg_profiles_protect_privileged`);
        await q(`revoke update (role) on public.profiles from authenticated`); // cara yang tertulis di ARCHITECTURE awal
        await switchTo(q, asUser(ID.alice));
        return q<{ role: string }>(
          `update public.profiles set role = 'admin' where id = $1 returning role`,
          [ID.alice],
        );
      });
      // Tanpa trigger, pengguna berhasil menjadi admin walaupun kolomnya "di-revoke".
      expect(outcome).toEqual([{ role: 'admin' }]);
    });
  });

  // ===========================================================================
  describe('signup: handle_new_user + sinkron peran', () => {
    const signup = (meta: Record<string, unknown>, email = 'baru@t.test') =>
      withSession(db, asService, async (q) => {
        const [user] = await q<{ id: string }>(
          `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
          [email, JSON.stringify(meta)],
        );
        const [profile] = await q<{ name: string; role: string; requested_role: string | null }>(
          `select name, role, requested_role from public.profiles where id = $1`,
          [user!.id],
        );
        const [auth] = await q<{ role: string | null }>(
          `select raw_app_meta_data ->> 'role' as role from auth.users where id = $1`,
          [user!.id],
        );
        return { profile, jwtRole: auth!.role };
      });

    it('tanpa metadata: nama dari bagian email (perilaku Flutter tidak berubah)', async () => {
      const { profile } = await signup({}, 'budi.santoso@t.test');
      expect(profile).toEqual({ name: 'budi.santoso', role: 'user', requested_role: null });
    });

    it('full_name dipakai sebagai nama', async () => {
      const { profile } = await signup({ full_name: 'Dewi Lestari' });
      expect(profile?.name).toBe('Dewi Lestari');
    });

    it('"Saya psikolog" hanya menjadi PERMINTAAN verifikasi; role tetap user', async () => {
      const { profile } = await signup({ full_name: 'Dr. Eva', requested_role: 'psychologist' });
      expect(profile).toMatchObject({ role: 'user', requested_role: 'psychologist' });
    });

    it('metadata role="admin" diabaikan (metadata bisa dikendalikan pengguna)', async () => {
      const { profile, jwtRole } = await signup({ role: 'admin', requested_role: 'admin' });
      expect(profile).toMatchObject({ role: 'user', requested_role: null });
      expect(jwtRole).toBe('user');
    });

    it('klaim JWT app_metadata.role tersinkron sejak signup', async () => {
      const { jwtRole } = await signup({});
      expect(jwtRole).toBe('user');
    });
  });

  // ===========================================================================
  describe('care_links: persetujuan hanya dari pasien', () => {
    it('pasien dan psikolog yang dituju melihat link-nya; pihak lain tidak', async () => {
      const sql = `select id from public.care_links`;
      expect(await count(asUser(ID.alice), sql)).toBe(1);
      expect(await count(asUser(ID.rina), sql)).toBe(1);
      expect(await count(asUser(ID.mallory), sql)).toBe(0);
      expect(await count(asAnon, sql).catch(() => 0)).toBe(0);
    });

    it('pasien boleh memberi izin ke psikolog aktif', async () => {
      const rows = await run<{ status: string }>(
        asUser(ID.bob),
        `insert into public.care_links (patient_id, psychologist_id) values ($1, $2) returning status`,
        [ID.bob, ID.psychologist],
      );
      expect(rows).toEqual([{ status: 'active' }]);
    });

    it('psikolog TIDAK bisa membuat link atas nama pasien', async () => {
      const failure = await expectFailure(
        asUser(ID.rina),
        `insert into public.care_links (patient_id, psychologist_id) values ($1, $2)`,
        [ID.bob, ID.psychologist],
      );
      expect(failure.code).toBe('42501');
    });

    it('pengguna tidak bisa membuat link untuk pasien lain', async () => {
      const failure = await expectFailure(
        asUser(ID.mallory),
        `insert into public.care_links (patient_id, psychologist_id) values ($1, $2)`,
        [ID.bob, ID.psychologist],
      );
      expect(failure.code).toBe('42501');
    });

    it('tidak bisa memberi izin ke psikolog yang tidak aktif', async () => {
      const failure = await withSession(db, asService, async (q) => {
        await q(`update public.psychologists set is_active = false where id = $1`, [
          ID.psychologist,
        ]);
        await switchTo(q, asUser(ID.bob));
        try {
          await q(`insert into public.care_links (patient_id, psychologist_id) values ($1, $2)`, [
            ID.bob,
            ID.psychologist,
          ]);
          return null;
        } catch (error) {
          return (error as { code?: string }).code;
        }
      });
      expect(failure).toBe('42501');
    });

    it('mencabut izin mengisi revoked_at otomatis; mengaktifkan lagi menghapusnya dan memperbarui consented_at', async () => {
      const result = await withSession(db, asUser(ID.alice), async (q) => {
        const [before] = await q<{ consented_at: string }>(
          `select consented_at from public.care_links where id = $1`,
          [ID.careLink],
        );
        const [revoked] = await q<{ status: string; revoked_at: string | null }>(
          `update public.care_links set status = 'revoked' where id = $1 returning status, revoked_at`,
          [ID.careLink],
        );
        const [again] = await q<{ revoked_at: string | null; renewed: boolean }>(
          `update public.care_links set status = 'active' where id = $1
           returning revoked_at, consented_at > $2::timestamptz as renewed`,
          [ID.careLink, before!.consented_at],
        );
        return { revoked, again };
      });
      expect(result.revoked?.status).toBe('revoked');
      expect(result.revoked?.revoked_at).not.toBeNull();
      expect(result.again?.revoked_at).toBeNull();
    });

    it('psikolog TIDAK bisa mengubah izin (tidak ada policy update)', async () => {
      const rows = await run(
        asUser(ID.rina),
        `update public.care_links set permissions = '{"ai_summary":true}' where id = $1 returning id`,
        [ID.careLink],
      );
      expect(rows).toHaveLength(0);
    });

    it('link tidak bisa dipindahkan ke psikolog/pasien lain lewat update', async () => {
      const rows = await run<{ patient_id: string; psychologist_id: string }>(
        asUser(ID.alice),
        `update public.care_links set patient_id = $2, psychologist_id = $3 where id = $1 returning patient_id, psychologist_id`,
        [ID.careLink, ID.bob, ID.psychologist],
      ).catch(() => null);
      // Bisa ditolak policy WITH CHECK atau dinetralkan trigger; yang penting tidak berpindah.
      if (rows) expect(rows[0]).toEqual({ patient_id: ID.alice, psychologist_id: ID.psychologist });
    });

    it('riwayat persetujuan tidak bisa dihapus (jejak audit)', async () => {
      const failure = await expectFailure(
        asUser(ID.alice),
        `delete from public.care_links where id = $1`,
        [ID.careLink],
      );
      expect(failure.code).toBe('42501');
    });

    it('JSON izin yang buruk dari klien tidak menjatuhkan query dan tidak memberi akses', async () => {
      const n = await withSession(db, asService, async (q) => {
        await q(
          `update public.care_links set permissions = '{"assessments":"ya","mood":[1]}' where id = $1`,
          [ID.careLink],
        );
        await switchTo(q, asUser(ID.rina));
        return (await q<{ n: number }>(`select count(*)::int as n from public.assessments`))[0]!.n;
      });
      expect(n).toBe(0);
    });

    it('permissions harus berupa objek JSON', async () => {
      const failure = await expectFailure(
        asUser(ID.alice),
        `update public.care_links set permissions = '[]' where id = $1`,
        [ID.careLink],
      );
      expect(failure.code).toBe('23514');
    });
  });

  // ===========================================================================
  describe('can_view: data pengguna yang dibagikan', () => {
    const readable = (session: Session, table: string) =>
      count(session, `select 1 from public.${table} where user_id = '${ID.alice}'`);

    it('pemilik membaca datanya sendiri', async () => {
      expect(await readable(asUser(ID.alice), 'assessments')).toBe(1);
      expect(await readable(asUser(ID.alice), 'mood_entries')).toBe(1);
      expect(await readable(asUser(ID.alice), 'sleep_entries')).toBe(1);
    });

    it('psikolog berizin membaca asesmen, mood, dan tidur kliennya', async () => {
      expect(await readable(asUser(ID.rina), 'assessments')).toBe(1);
      expect(await readable(asUser(ID.rina), 'mood_entries')).toBe(1);
      expect(await readable(asUser(ID.rina), 'sleep_entries')).toBe(1);
    });

    it('izin per jenis data: mematikan "assessments" hanya menyembunyikan asesmen', async () => {
      const result = await withSession(db, asUser(ID.alice), async (q) => {
        await q(
          `update public.care_links set permissions = jsonb_set(permissions, '{assessments}', 'false') where id = $1`,
          [ID.careLink],
        );
        await switchTo(q, asUser(ID.rina));
        const a = await q<{ n: number }>(
          `select count(*)::int n from public.assessments where user_id = $1`,
          [ID.alice],
        );
        const m = await q<{ n: number }>(
          `select count(*)::int n from public.mood_entries where user_id = $1`,
          [ID.alice],
        );
        return { assessments: a[0]!.n, mood: m[0]!.n };
      });
      expect(result).toEqual({ assessments: 0, mood: 1 });
    });

    it('izin dicabut → akses hilang seketika', async () => {
      const n = await withSession(db, asUser(ID.alice), async (q) => {
        await q(`update public.care_links set status = 'revoked' where id = $1`, [ID.careLink]);
        await switchTo(q, asUser(ID.rina));
        return (
          await q<{ n: number }>(
            `select count(*)::int n from public.mood_entries where user_id = $1`,
            [ID.alice],
          )
        )[0]!.n;
      });
      expect(n).toBe(0);
    });

    it('pengguna lain dan penyerang tidak bisa membaca apa pun', async () => {
      for (const who of [ID.bob, ID.mallory]) {
        expect(await readable(asUser(who), 'assessments')).toBe(0);
        expect(await readable(asUser(who), 'mood_entries')).toBe(0);
        expect(await readable(asUser(who), 'sleep_entries')).toBe(0);
      }
      expect(await readable(asAnon, 'assessments').catch(() => 0)).toBe(0);
    });

    it('pendamping aktif hanya melihat jenis data yang diizinkan (mood saja)', async () => {
      expect(await readable(asUser(ID.ibu), 'mood_entries')).toBe(1);
      expect(await readable(asUser(ID.ibu), 'assessments')).toBe(0);
      expect(await readable(asUser(ID.ibu), 'sleep_entries')).toBe(0); // pendamping tidak punya izin tidur sama sekali
    });

    it('pendamping mendapat asesmen bila pasien mengizinkan assessment_results', async () => {
      const n = await withSession(db, asService, async (q) => {
        await q(
          `update public.caregiver_relationships set permissions = jsonb_set(permissions, '{assessment_results}', 'true') where id = $1`,
          [ID.aliceRelationship],
        );
        await switchTo(q, asUser(ID.ibu));
        return (
          await q<{ n: number }>(
            `select count(*)::int n from public.assessments where user_id = $1`,
            [ID.alice],
          )
        )[0]!.n;
      });
      expect(n).toBe(1);
    });

    it('akses baca TIDAK berarti akses tulis: psikolog tidak bisa mengubah, menambah, atau menghapus', async () => {
      const upd = await run(
        asUser(ID.rina),
        `update public.mood_entries set note = 'diubah' where user_id = $1 returning id`,
        [ID.alice],
      );
      expect(upd).toHaveLength(0);
      const del = await run(
        asUser(ID.rina),
        `delete from public.assessments where user_id = $1 returning id`,
        [ID.alice],
      );
      expect(del).toHaveLength(0);
      const ins = await expectFailure(
        asUser(ID.rina),
        `insert into public.mood_entries (user_id, mood_type) values ($1, 'tenang')`,
        [ID.alice],
      );
      expect(ins.code).toBe('42501');
    });
  });

  // ===========================================================================
  describe('trigger: asesmen → crisis_alerts (juga dari aplikasi mobile)', () => {
    const insertAssessment = (
      type: string,
      answers: unknown,
      category: string | null = null,
      who = ID.alice,
    ) =>
      withSession(db, asUser(who), async (q) => {
        const [row] = await q<{ id: string }>(
          `insert into public.assessments (user_id, type, answers, total_score, category)
           values ($1, $2, $3::jsonb, 5, $4) returning id`,
          [who, type, JSON.stringify(answers), category],
        );
        await q('reset role');
        const alerts = await q<{ severity: string; source: string; source_id: string }>(
          `select severity, source, source_id from public.crisis_alerts where user_id = $1`,
          [who],
        );
        return { id: row!.id, alerts };
      });

    it('PHQ-9 item 9 > 0 → alert critical dengan sumber asesmen tersebut', async () => {
      const { id, alerts } = await insertAssessment('phq9', [{ question_id: 'phq9_9', score: 2 }]);
      expect(alerts).toEqual([{ severity: 'critical', source: 'assessment', source_id: id }]);
    });

    it('PHQ-9 item 9 = 0 dan kategori sedang → tidak ada alert', async () => {
      const { alerts } = await insertAssessment(
        'phq9',
        [{ question_id: 'phq9_9', score: 0 }],
        'moderate',
      );
      expect(alerts).toHaveLength(0);
    });

    it('SRQ-20 item 17 > 0 → critical', async () => {
      const { alerts } = await insertAssessment('srq20', [{ question_id: 'srq20_17', score: 1 }]);
      expect(alerts[0]?.severity).toBe('critical');
    });

    it('kategori severe tanpa ide bunuh diri → high', async () => {
      const { alerts } = await insertAssessment(
        'pss10',
        [{ question_id: 'pss10_1', score: 4 }],
        'severe',
      );
      expect(alerts[0]?.severity).toBe('high');
    });

    it('phq9_9 pada instrumen lain (gad7) tidak dihitung', async () => {
      const { alerts } = await insertAssessment('gad7', [{ question_id: 'phq9_9', score: 3 }]);
      expect(alerts).toHaveLength(0);
    });

    it('skor desimal 1.0 tetap terdeteksi', async () => {
      const { alerts } = await insertAssessment('phq9', [{ question_id: 'phq9_9', score: 1.0 }]);
      expect(alerts[0]?.severity).toBe('critical');
    });

    it.each([
      ['skor berupa teks', [{ question_id: 'phq9_9', score: 'banyak' }]],
      ['elemen bukan objek', [1, 'a', null]],
      ['answers berupa objek', { question_id: 'phq9_9', score: 3 }],
      ['answers berupa teks', 'rusak'],
      ['array kosong', []],
    ])(
      'data aneh (%s) TIDAK menggagalkan penyimpanan asesmen dari aplikasi',
      async (_nama, answers) => {
        await expect(insertAssessment('phq9', answers)).resolves.toBeDefined();
      },
    );

    it('satu alert per sumber (indeks unik)', async () => {
      const failure = await withSession(db, asService, async (q) => {
        const { id } = (
          await q<{ id: string }>(
            `insert into public.assessments (user_id, type, answers, total_score, category)
           values ($1, 'phq9', '[{"question_id":"phq9_9","score":3}]', 20, 'severe') returning id`,
            [ID.alice],
          )
        )[0]!;
        try {
          await q(
            `insert into public.crisis_alerts (user_id, source, source_id, severity) values ($1, 'assessment', $2, 'high')`,
            [ID.alice, id],
          );
          return null;
        } catch (error) {
          return (error as { code?: string }).code;
        }
      });
      expect(failure).toBe('23505');
    });
  });

  // ===========================================================================
  describe('crisis_alerts: siapa melihat dan menangani', () => {
    /** Buat satu alert kritis milik Alice, lalu jalankan `fn` dalam transaksi yang sama. */
    async function withAlert<T>(
      session: Session,
      fn: (q: Query, alertId: string) => Promise<T>,
    ): Promise<T> {
      return withSession(db, asService, async (q) => {
        const [alert] = await q<{ id: string }>(
          `insert into public.crisis_alerts (user_id, source, severity) values ($1, 'manual', 'critical') returning id`,
          [ID.alice],
        );
        await switchTo(q, session);
        return fn(q, alert!.id);
      });
    }

    it('pemilik, psikolog berizin, dan pendamping berizin darurat melihat alert', async () => {
      for (const who of [ID.alice, ID.rina, ID.ibu]) {
        expect(
          await withAlert(
            asUser(who),
            async (q) => (await q(`select id from public.crisis_alerts`)).length,
          ),
        ).toBe(1);
      }
    });

    it('pengguna lain dan penyerang tidak melihatnya', async () => {
      for (const who of [ID.bob, ID.mallory]) {
        expect(
          await withAlert(
            asUser(who),
            async (q) => (await q(`select id from public.crisis_alerts`)).length,
          ),
        ).toBe(0);
      }
    });

    it('izin crisis_alerts dimatikan pasien → psikolog tidak lagi melihat', async () => {
      const n = await withSession(db, asService, async (q) => {
        await q(
          `update public.care_links set permissions = jsonb_set(permissions, '{crisis_alerts}', 'false') where id = $1`,
          [ID.careLink],
        );
        await q(
          `insert into public.crisis_alerts (user_id, source, severity) values ($1, 'manual', 'high')`,
          [ID.alice],
        );
        await switchTo(q, asUser(ID.rina));
        return (await q(`select id from public.crisis_alerts`)).length;
      });
      expect(n).toBe(0);
    });

    it('psikolog menandai ditangani: status berubah dan penanganya tercatat otomatis', async () => {
      const row = await withAlert(asUser(ID.rina), async (q, id) => {
        const [r] = await q<{ status: string; acknowledged_by: string; has_time: boolean }>(
          `update public.crisis_alerts set status = 'acknowledged', acknowledged_by = $2 where id = $1
           returning status, acknowledged_by, acknowledged_at is not null as has_time`,
          [id, ID.mallory], // klien mencoba memalsukan penangan
        );
        return r;
      });
      expect(row).toEqual({ status: 'acknowledged', acknowledged_by: ID.rina, has_time: true });
    });

    it('PEMILIK tidak bisa menutup alert-nya sendiri (akan menyembunyikannya dari psikolog)', async () => {
      const rows = await withAlert(asUser(ID.alice), (q, id) =>
        q(`update public.crisis_alerts set status = 'resolved' where id = $1 returning id`, [id]),
      );
      expect(rows).toHaveLength(0);
    });

    it('penyerang tidak bisa mengubah alert orang lain', async () => {
      const rows = await withAlert(asUser(ID.mallory), (q, id) =>
        q(`update public.crisis_alerts set status = 'resolved' where id = $1 returning id`, [id]),
      );
      expect(rows).toHaveLength(0);
    });

    it('responder hanya boleh mengubah status: severity dan pemilik beku', async () => {
      const failure = await withAlert(asUser(ID.rina), async (q, id) => {
        try {
          await q(`update public.crisis_alerts set severity = 'high' where id = $1`, [id]);
          return null;
        } catch (error) {
          return (error as { code?: string }).code;
        }
      });
      expect(failure).toBe('42501');
    });

    it('alert yang sudah ditangani tidak bisa dibuka kembali', async () => {
      const failure = await withAlert(asUser(ID.rina), async (q, id) => {
        await q(`update public.crisis_alerts set status = 'resolved' where id = $1`, [id]);
        try {
          await q(`update public.crisis_alerts set status = 'open' where id = $1`, [id]);
          return null;
        } catch (error) {
          return (error as { code?: string }).code;
        }
      });
      expect(failure).toBe('42501');
    });

    it('pengguna boleh membuat alert untuk dirinya sendiri, tetapi tidak untuk orang lain', async () => {
      const own = await run(
        asUser(ID.alice),
        `insert into public.crisis_alerts (user_id, source, severity) values ($1, 'ai_chat', 'high') returning id`,
        [ID.alice],
      );
      expect(own).toHaveLength(1);
      const other = await expectFailure(
        asUser(ID.alice),
        `insert into public.crisis_alerts (user_id, source, severity) values ($1, 'ai_chat', 'high')`,
        [ID.bob],
      );
      expect(other.code).toBe('42501');
    });

    it('alert tidak bisa dihapus pengguna', async () => {
      const failure = await expectFailure(asUser(ID.alice), `delete from public.crisis_alerts`);
      expect(failure.code).toBe('42501');
    });
  });

  // ===========================================================================
  describe('log_access: jejak "siapa membuka data siapa"', () => {
    it('psikolog berizin dicatat, dan pemilik data bisa melihatnya', async () => {
      const result = await withSession(db, asUser(ID.rina), async (q) => {
        await q(`select public.log_access($1, 'assessments', 'read')`, [ID.alice]);
        await switchTo(q, asUser(ID.alice));
        return q<{ actor_id: string; actor_role: string; resource: string; action: string }>(
          `select actor_id, actor_role, resource, action from public.data_access_logs`,
        );
      });
      expect(result).toEqual([
        { actor_id: ID.rina, actor_role: 'psychologist', resource: 'assessments', action: 'read' },
      ]);
    });

    it('pembukaan berulang dalam 5 menit dicatat sekali; jenis data berbeda dicatat terpisah', async () => {
      const n = await withSession(db, asUser(ID.rina), async (q) => {
        await q(`select public.log_access($1, 'assessments')`, [ID.alice]);
        await q(`select public.log_access($1, 'assessments')`, [ID.alice]);
        await q(`select public.log_access($1, 'mood')`, [ID.alice]);
        await switchTo(q, asUser(ID.alice));
        return (await q(`select 1 from public.data_access_logs`)).length;
      });
      expect(n).toBe(2);
    });

    it('PENYERANG tidak bisa memalsukan atau membanjiri log milik orang lain', async () => {
      const failure = await expectFailure(
        asUser(ID.mallory),
        `select public.log_access($1, 'assessments')`,
        [ID.alice],
      );
      expect(failure.code).toBe('42501');
    });

    it('psikolog tidak bisa mencatat jenis data yang tidak diizinkan (ai_summary = false)', async () => {
      const failure = await expectFailure(
        asUser(ID.rina),
        `select public.log_access($1, 'ai_summary')`,
        [ID.alice],
      );
      expect(failure.code).toBe('42501');
    });

    it('akses ke data sendiri tidak dicatat', async () => {
      const n = await withSession(db, asUser(ID.alice), async (q) => {
        await q(`select public.log_access($1, 'mood')`, [ID.alice]);
        return (await q(`select 1 from public.data_access_logs`)).length;
      });
      expect(n).toBe(0);
    });

    it('aksi yang tidak dikenal ditolak', async () => {
      const failure = await expectFailure(
        asUser(ID.rina),
        `select public.log_access($1, 'mood', 'hapus')`,
        [ID.alice],
      );
      expect(failure.code).toBe('22023');
    });

    it('tidak ada jalan tulis langsung ke tabel log (hak INSERT dicabut)', async () => {
      const failure = await expectFailure(
        asUser(ID.mallory),
        `insert into public.data_access_logs (actor_id, subject_id, actor_role, resource) values ($1, $2, 'user', 'mood')`,
        [ID.mallory, ID.alice],
      );
      expect(failure.code).toBe('42501');
    });

    it('pelaku tidak melihat log milik orang lain; anon tidak bisa memanggil fungsi', async () => {
      const n = await withSession(db, asUser(ID.rina), async (q) => {
        await q(`select public.log_access($1, 'mood')`, [ID.alice]);
        return (await q(`select 1 from public.data_access_logs`)).length; // Rina bukan subjek
      });
      expect(n).toBe(0);
      const failure = await expectFailure(asAnon, `select public.log_access($1, 'mood')`, [
        ID.alice,
      ]);
      expect(failure.code).toBe('42501');
    });
  });

  // ===========================================================================
  describe('facilities, facility_admins, api_clients', () => {
    it('direktori faskes bisa dibaca publik (anon), tetapi tidak ditulis', async () => {
      expect(await count(asAnon, `select 1 from public.facilities`)).toBe(2);
      expect(
        (
          await expectFailure(
            asAnon,
            `insert into public.facilities (name,type,city,province) values ('x','klinik','y','z')`,
          )
        ).code,
      ).toBe('42501');
    });

    it('hanya admin sistem yang boleh menulis faskes', async () => {
      const sql = `insert into public.facilities (name,type,city,province) values ('Baru','klinik','Kota X','Prov Y') returning id`;
      expect((await expectFailure(asUser(ID.mallory), sql)).code).toBe('42501');
      expect((await expectFailure(asUser(ID.fia), sql)).code).toBe('42501'); // admin faskes ≠ admin sistem
      expect(await run(asUser(ID.admin), sql)).toHaveLength(1);
    });

    it('keanggotaan faskes hanya terlihat oleh yang bersangkutan (dan admin sistem)', async () => {
      expect(await count(asUser(ID.fia), `select 1 from public.facility_admins`)).toBe(1);
      expect(await count(asUser(ID.mallory), `select 1 from public.facility_admins`)).toBe(0);
      expect(await count(asUser(ID.admin), `select 1 from public.facility_admins`)).toBe(2);
    });

    const newKey = (facility: string, owner: string, extra = '') =>
      `insert into public.api_clients (name, owner_id, facility_id, key_prefix, key_hash ${extra ? ', ' + extra.split('=')[0] : ''})
       values ('SIMPUS', '${owner}', '${facility}', 'mk_live_', '${Math.random().toString(16).slice(2)}' ${extra ? ', ' + extra.split('=')[1] : ''}) returning id`;

    it('admin faskes membuat kunci API untuk faskesnya sendiri', async () => {
      expect(await run(asUser(ID.fia), newKey(ID.facilityA, ID.fia))).toHaveLength(1);
    });

    it('TIDAK untuk faskes lain, dan bukan atas nama orang lain', async () => {
      expect((await expectFailure(asUser(ID.fia), newKey(ID.facilityB, ID.fia))).code).toBe(
        '42501',
      );
      expect((await expectFailure(asUser(ID.fia), newKey(ID.facilityA, ID.zed))).code).toBe(
        '42501',
      );
      expect((await expectFailure(asUser(ID.mallory), newKey(ID.facilityA, ID.mallory))).code).toBe(
        '42501',
      );
    });

    it('scope di luar daftar yang dikenal ditolak', async () => {
      const failure = await expectFailure(
        asUser(ID.fia),
        newKey(ID.facilityA, ID.fia, `scopes='{admin:all}'::text[]`),
      );
      expect(failure.code).toBe('23514');
    });

    it('pemilik hanya bisa MENCABUT: scope/hash/nama beku, dan tidak bisa dihidupkan lagi', async () => {
      const result = await withSession(db, asUser(ID.fia), async (q) => {
        const id = (await q<{ id: string }>(newKey(ID.facilityA, ID.fia)))[0]!.id;
        const attempt = async (sql: string) => {
          await q('savepoint s');
          try {
            await q(sql, [id]);
            await q('release savepoint s');
            return 'ok';
          } catch (error) {
            await q('rollback to savepoint s');
            return (error as { code?: string }).code;
          }
        };
        return {
          rename: await attempt(`update public.api_clients set name = 'x' where id = $1`),
          rehash: await attempt(`update public.api_clients set key_hash = 'baru' where id = $1`),
          revoke: await attempt(`update public.api_clients set revoked_at = now() where id = $1`),
          revive: await attempt(`update public.api_clients set revoked_at = null where id = $1`),
        };
      });
      expect(result).toEqual({ rename: '42501', rehash: '42501', revoke: 'ok', revive: '42501' });
    });

    it('kunci hanya terlihat oleh pemiliknya', async () => {
      const n = await withSession(db, asUser(ID.fia), async (q) => {
        await q(newKey(ID.facilityA, ID.fia));
        await switchTo(q, asUser(ID.mallory));
        return (await q(`select 1 from public.api_clients`)).length;
      });
      expect(n).toBe(0);
    });
  });

  // ===========================================================================
  describe('facility_aggregate: agregat anonim, k ≥ 10', () => {
    const range = [`current_date - 30`, `current_date + 1`];

    /** Buat `n` pengguna di kota/provinsi tertentu, masing-masing dengan mood, dan `phq`/`gad` jumlah asesmen. */
    async function seedCity(
      q: Query,
      city: string,
      province: string,
      n: number,
      opts: { phq?: number; gad?: number; ideation?: number } = {},
    ) {
      const users = await q<{ id: string }>(
        `insert into auth.users (email) select 'u' || g || '-' || $1 || '@seed.test' from generate_series(1, $2) g returning id`,
        [city.replace(/\W/g, ''), n],
      );
      const ids = users.map((u) => u.id);
      await q(
        `update public.profiles set city = $1, domicile_province = $2 where id = any($3::uuid[])`,
        [city, province, ids],
      );
      await q(
        `insert into public.mood_entries (user_id, mood_type) select unnest($1::uuid[]), 'tenang'`,
        [ids],
      );
      const phq = opts.phq ?? 0;
      const gad = opts.gad ?? 0;
      if (phq)
        await q(
          `insert into public.assessments (user_id, type, answers, total_score, category) select unnest($1::uuid[]), 'phq9', '[]', 10, 'moderate'`,
          [ids.slice(0, phq)],
        );
      if (gad)
        await q(
          `insert into public.assessments (user_id, type, answers, total_score, category) select unnest($1::uuid[]), 'gad7', '[]', 6, 'mild'`,
          [ids.slice(0, gad)],
        );
      if (opts.ideation)
        await q(
          `insert into public.assessments (user_id, type, answers, total_score, category) select unnest($1::uuid[]), 'phq9', '[{"question_id":"phq9_9","score":2}]', 15, 'moderate'`,
          [ids.slice(0, opts.ideation)],
        );
      return ids;
    }

    const aggregate = (facility: string) =>
      `select * from public.facility_aggregate('${facility}', ${range[0]}, ${range[1]}) order by city`;

    it('wewenang: admin faskes tersebut dan service_role; selain itu ditolak', async () => {
      expect(await run(asUser(ID.fia), aggregate(ID.facilityA))).toBeDefined();
      expect(await run(asService, aggregate(ID.facilityA))).toBeDefined();
      for (const who of [asUser(ID.alice), asUser(ID.rina), asUser(ID.mallory), asUser(ID.zed)]) {
        expect((await expectFailure(who, aggregate(ID.facilityA))).code).toBe('42501');
      }
      expect((await expectFailure(asAnon, aggregate(ID.facilityA))).code).toBe('42501');
    });

    it('rentang tanggal yang tidak masuk akal ditolak', async () => {
      const failure = await expectFailure(
        asUser(ID.fia),
        `select * from public.facility_aggregate('${ID.facilityA}', current_date, current_date - 5)`,
      );
      expect(failure.code).toBe('22023');
      const huge = await expectFailure(
        asUser(ID.fia),
        `select * from public.facility_aggregate('${ID.facilityA}', current_date - 1000, current_date)`,
      );
      expect(huge.code).toBe('22023');
    });

    it('grup < 10 pengguna DISEMBUNYIKAN total (semua angka null, termasuk jumlah pengguna)', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await seedCity(q, 'Kab. Cianjur', 'Jawa Barat', 5, { phq: 5 });
        await switchTo(q, asUser(ID.fia));
        return q<Record<string, unknown>>(`${aggregate(ID.facilityA)}`);
      });
      const cianjur = rows.find((r) => r.city === 'Kab. Cianjur');
      expect(cianjur).toMatchObject({
        suppressed: true,
        active_users: null,
        avg_phq9: null,
        avg_gad7: null,
        avg_pss10: null,
        minimal_count: null,
        mild_count: null,
        moderate_count: null,
        severe_count: null,
        crisis_alert_count: null,
      });
    });

    it('grup ≥ 10 ditampilkan; metrik dengan < 10 pengguna tetap disembunyikan (k per metrik)', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await seedCity(q, 'Kota Depok', 'Jawa Barat', 12, { phq: 12, gad: 4 });
        await switchTo(q, asUser(ID.fia));
        return q<Record<string, unknown>>(aggregate(ID.facilityA));
      });
      const depok = rows.find((r) => r.city === 'Kota Depok');
      expect(depok).toMatchObject({ suppressed: false, active_users: 12 });
      expect(Number(depok?.avg_phq9)).toBe(10); // 12 pengguna PHQ-9, semuanya skor 10
      expect(depok?.avg_gad7).toBeNull(); // hanya 4 orang mengisi GAD-7 → bisa membocorkan skor individu
    });

    it('hitungan kategori dan alert krisis ikut, hanya untuk grup yang lolos', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await seedCity(q, 'Kota Depok', 'Jawa Barat', 12, { phq: 12, ideation: 3 });
        await switchTo(q, asUser(ID.fia));
        return q<Record<string, unknown>>(aggregate(ID.facilityA));
      });
      const depok = rows.find((r) => r.city === 'Kota Depok');
      expect(depok?.moderate_count).toBe(15); // 12 + 3 asesmen kategori sedang
      expect(depok?.crisis_alert_count).toBe(3); // 3 asesmen dengan PHQ-9 item 9 > 0 → 3 alert (otomatis)
    });

    it('hanya provinsi faskes yang tampil: kota di provinsi lain tidak muncul sama sekali', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await seedCity(q, 'Kota Surabaya', 'Jawa Timur', 15, { phq: 15 });
        await switchTo(q, asUser(ID.fia));
        return q<{ city: string }>(aggregate(ID.facilityA));
      });
      expect(rows.map((r) => r.city)).not.toContain('Kota Surabaya');
    });

    it('rentang tanggal memfilter: rentang di masa depan → kosong', async () => {
      const rows = await withSession(db, asService, async (q) => {
        await seedCity(q, 'Kota Depok', 'Jawa Barat', 12, { phq: 12 });
        await switchTo(q, asUser(ID.fia));
        return q(
          `select * from public.facility_aggregate('${ID.facilityA}', current_date + 10, current_date + 20)`,
        );
      });
      expect(rows).toHaveLength(0);
    });

    it('JAMINAN STRUKTURAL: fungsi tidak memiliki kolom yang mengidentifikasi individu', async () => {
      const [fn] = await run<{ names: string[] }>(
        asService,
        `select proargnames as names from pg_proc where proname = 'facility_aggregate'`,
      );
      const output = (fn!.names as string[]).filter((name) => !name.startsWith('p_'));
      expect(output).toEqual([
        'city',
        'province',
        'week_start',
        'suppressed',
        'active_users',
        'avg_phq9',
        'avg_gad7',
        'avg_pss10',
        'minimal_count',
        'mild_count',
        'moderate_count',
        'severe_count',
        'crisis_alert_count',
      ]);
      for (const name of output)
        expect(name).not.toMatch(
          /^(id|user_id|profile_id|name|full_name|email|nik|date_of_birth)$/i,
        );
    });
  });

  // ===========================================================================
  describe('caregiver_relationships: pengamanan tambahan (kompatibel Flutter)', () => {
    const FLUTTER_ACCEPT = (code: string) => ({
      select: `select * from public.caregiver_relationships where invite_code = '${code}' and status = 'pending'`,
      update: `update public.caregiver_relationships set caregiver_id = $1, status = 'active' where id = $2 returning status`,
    });

    it('alur Flutter acceptInvite tetap berjalan (select by kode + update caregiver_id & status)', async () => {
      const rows = await withSession(db, asUser(ID.ibu), async (q) => {
        const [invite] = await q<{ id: string }>(FLUTTER_ACCEPT('PENDING1').select);
        return q(FLUTTER_ACCEPT('PENDING1').update, [ID.ibu, invite!.id]);
      });
      expect(rows).toEqual([{ status: 'active' }]);
    });

    it('menolak undangan sambil mengisi caregiver_id (pending → declined) lolos penjaga', async () => {
      const rows = await run(
        asUser(ID.ibu),
        `update public.caregiver_relationships set caregiver_id = $1, status = 'declined' where invite_code = 'PENDING1' returning status`,
        [ID.ibu],
      );
      expect(rows).toEqual([{ status: 'declined' }]);
    });

    it('pasien tetap bebas mengubah izin, mencabut, dan mengaktifkan lagi (updatePermissions)', async () => {
      const rows = await withSession(db, asUser(ID.alice), async (q) => {
        await q(
          `update public.caregiver_relationships set permissions = '{"mood_daily":false,"assessment_results":true}' where id = $1`,
          [ID.aliceRelationship],
        );
        await q(`update public.caregiver_relationships set status = 'revoked' where id = $1`, [
          ID.aliceRelationship,
        ]);
        return q(
          `update public.caregiver_relationships set status = 'active' where id = $1 returning status`,
          [ID.aliceRelationship],
        );
      });
      expect(rows).toEqual([{ status: 'active' }]);
    });

    it('SERANGAN: penerima undangan tidak bisa menulis ulang permissions menjadi serba true', async () => {
      const failure = await expectFailure(
        asUser(ID.mallory),
        `update public.caregiver_relationships
            set caregiver_id = $1, status = 'active',
                permissions = '{"mood_daily":true,"assessment_results":true,"emergency_alerts":true,"app_activity":true}'
          where id = $2`,
        [ID.mallory, ID.bobInvite],
      );
      expect(failure.code).toBe('42501');
    });

    it('SERANGAN: tidak bisa mendaftarkan akun LAIN sebagai pendamping, atau mengganti pasien/kode', async () => {
      for (const sql of [
        `update public.caregiver_relationships set caregiver_id = '${ID.ibu}', status = 'active' where id = $1`,
        `update public.caregiver_relationships set patient_id = '${ID.mallory}' where id = $1`,
        `update public.caregiver_relationships set invite_code = 'DIBAJAK01' where id = $1`,
      ]) {
        expect((await expectFailure(asUser(ID.mallory), sql, [ID.bobInvite])).code).toBe('42501');
      }
    });

    it('SERANGAN: pendamping yang sudah DICABUT pasien tidak bisa mengaktifkan dirinya lagi', async () => {
      const failure = await withSession(db, asService, async (q) => {
        await q(`update public.caregiver_relationships set status = 'revoked' where id = $1`, [
          ID.aliceRelationship,
        ]);
        await switchTo(q, asUser(ID.ibu));
        try {
          await q(`update public.caregiver_relationships set status = 'active' where id = $1`, [
            ID.aliceRelationship,
          ]);
          return null;
        } catch (error) {
          return (error as { code?: string }).code;
        }
      });
      expect(failure).toBe('42501');
    });

    it('pendamping aktif boleh mundur sendiri (active → revoked)', async () => {
      const rows = await run(
        asUser(ID.ibu),
        `update public.caregiver_relationships set status = 'revoked' where id = $1 returning status`,
        [ID.aliceRelationship],
      );
      expect(rows).toEqual([{ status: 'revoked' }]);
    });

    it('RESIDUAL (butuh perubahan aplikasi): undangan pending masih terbaca oleh siapa pun yang login', async () => {
      // Bila RPC accept_caregiver_invite sudah dipakai dan policy lama dihapus, tes ini
      // seharusnya GAGAL — lalu ubah ekspektasinya menjadi 0.
      expect(
        await count(
          asUser(ID.mallory),
          `select 1 from public.caregiver_relationships where status = 'pending'`,
        ),
      ).toBe(1);
    });
  });

  // ===========================================================================
  describe('temuan: bug BAWAAN aplikasi Flutter (bukan dari migrasi web)', () => {
    it('declineInvite versi Dart (update status saja) gagal oleh RLS bahkan TANPA migrasi web', async () => {
      // Policy UPDATE lama tidak punya WITH CHECK, jadi USING dipakai untuk baris baru; baris
      // 'declined' tidak lagi 'pending' dan caregiver_id masih null → ditolak. Perbaikannya ada di
      // sisi aplikasi/policy, bukan di migrasi web.
      const base = await createBaseDatabase();
      try {
        await base.exec(`
          insert into auth.users (id, email) values ('${ID.alice}', 'a@t.test'), ('${ID.ibu}', 'i@t.test');
          insert into public.caregiver_relationships (patient_id, invite_code, status)
            values ('${ID.alice}', 'PENDING1', 'pending');
        `);
        const failure = await expectFailureWithDb(
          base,
          asUser(ID.ibu),
          `update public.caregiver_relationships set status = 'declined' where invite_code = 'PENDING1'`,
        );
        expect(failure.message).toMatch(/row-level security/);
      } finally {
        await base.close();
      }
    }, 60_000);
  });

  // ===========================================================================
  describe('meta: invarian keamanan seluruh skema', () => {
    const NEW_TABLES = [
      'care_links',
      'crisis_alerts',
      'data_access_logs',
      'facilities',
      'facility_admins',
      'api_clients',
    ];

    it.each(NEW_TABLES)('tabel %s: RLS aktif dan punya policy', async (table) => {
      const [t] = await run<{ rls: boolean; policies: number }>(
        asService,
        `select c.relrowsecurity as rls,
                (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = $1`,
        [table],
      );
      expect(t).toEqual({ rls: true, policies: expect.any(Number) });
      expect(t!.policies).toBeGreaterThan(0);
    });

    it('SEMUA tabel di skema public memiliki RLS aktif (tidak ada tabel terbuka)', async () => {
      const open = await run<{ relname: string }>(
        asService,
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
      );
      expect(open).toEqual([]);
    });

    it('semua fungsi security definer di skema public memakai search_path kosong', async () => {
      const unsafe = await run<{ proname: string }>(
        asService,
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.prosecdef
            and not coalesce(p.proconfig @> array['search_path=""'], false)`,
      );
      expect(unsafe).toEqual([]);
    });

    it('fungsi trigger tidak bisa dipanggil sebagai RPC oleh anon/authenticated', async () => {
      const triggers = [
        'protect_profile_privileged_columns()',
        'sync_profile_role_to_auth()',
        'care_links_maintain_audit_fields()',
        'crisis_alerts_guard_update()',
        'create_crisis_alert_from_assessment()',
        'api_clients_guard_update()',
        'caregiver_relationships_guard_update()',
        'handle_new_user()',
      ];
      for (const fn of triggers) {
        const [priv] = await run<{ anon: boolean; authed: boolean }>(
          asService,
          `select has_function_privilege('anon', 'public.${fn}', 'execute') as anon,
                  has_function_privilege('authenticated', 'public.${fn}', 'execute') as authed`,
        );
        expect(priv, fn).toEqual({ anon: false, authed: false });
      }
    });

    it('fungsi RPC: anon tidak bisa, authenticated bisa', async () => {
      for (const fn of [
        'app_role()',
        'can_view(uuid,text)',
        'log_access(uuid,text,text)',
        'facility_aggregate(uuid,date,date)',
      ]) {
        const [priv] = await run<{ anon: boolean; authed: boolean }>(
          asService,
          `select has_function_privilege('anon', 'public.${fn}', 'execute') as anon,
                  has_function_privilege('authenticated', 'public.${fn}', 'execute') as authed`,
        );
        expect(priv, fn).toEqual({ anon: false, authed: true });
      }
    });

    it('idempotent: menjalankan migrasi web untuk kedua kalinya tidak error dan tidak menggandakan policy', async () => {
      const before = (
        await run<{ n: number }>(
          asService,
          `select count(*)::int n from pg_policies where schemaname = 'public'`,
        )
      )[0]!.n;
      await applyWebMigration(db);
      const after = (
        await run<{ n: number }>(
          asService,
          `select count(*)::int n from pg_policies where schemaname = 'public'`,
        )
      )[0]!.n;
      expect(after).toBe(before);
    });

    it('ADDITIVE ONLY: tidak ada drop table/column, rename, truncate, atau perubahan tipe', () => {
      const sql = readMigration(WEB_MIGRATION)
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .toLowerCase();
      expect(sql).not.toMatch(/\bdrop\s+table\b/);
      expect(sql).not.toMatch(/\bdrop\s+column\b/);
      expect(sql).not.toMatch(/\brename\s+(to|column)\b/);
      expect(sql).not.toMatch(/\btruncate\b\s+(table\s+)?public\./);
      expect(sql).not.toMatch(/\balter\s+column\b.*\btype\b/);
      // `drop` hanya untuk policy/trigger MILIK migrasi ini (agar idempotent).
      const drops = [...sql.matchAll(/\bdrop\s+(\w+)/g)].map((m) => m[1]);
      expect(new Set(drops)).toEqual(new Set(['policy', 'trigger']));
    });

    it('tabel Flutter tidak berubah bentuk: kolom lama tetap ada dengan tipe yang sama', async () => {
      const cols = await run<{ table_name: string; column_name: string }>(
        asService,
        `select table_name, column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'profiles'
            and column_name in ('id','email','name','city','domicile_province','font_size_preference','date_of_birth')`,
      );
      expect(cols).toHaveLength(7);
    });
  });
});
