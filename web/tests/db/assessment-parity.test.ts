// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  INSTRUMENT_IDS,
  INSTRUMENTS,
  type InstrumentId,
} from '@/lib/domain/assessment/instruments';
import { categoryFor, computeClinicalScore, maxScoreFor } from '@/lib/domain/assessment/scoring';
import { detectAssessmentCrisis } from '@/lib/domain/crisis/detector';
import { ID, seedFixtures } from './fixtures';
import {
  applyAllWebMigrations,
  applyHardeningMigration,
  applyIntegrityMigration,
  applyWebMigration,
  asService,
  asUser,
  createBaseDatabase,
  expectFailure as expectFailureWithDb,
  hasHardeningMigration,
  hasIntegrityMigration,
  hasMigrations,
  withSession,
  type Session,
} from './harness';

/**
 * Paritas database ↔ kode web ↔ aplikasi Flutter untuk skoring, dan integritas hasil asesmen (F6).
 * Tiga implementasi harus sepakat: SQL `classify_assessment` + trigger, `lib/domain/assessment`
 * (web), dan aturan Dart (diuji di scoring.test.ts).
 */
describe.skipIf(!hasMigrations || !hasHardeningMigration || !hasIntegrityMigration)(
  'integritas dan paritas skoring asesmen (F6)',
  () => {
    let db: PGlite;

    beforeAll(async () => {
      db = await createBaseDatabase();
      // seedFixtures butuh tabel web, jadi migrasi web dimuat dulu; trigger integritas dimuat
      // SETELAH fixtures supaya data fixture (jawaban sengaja tidak lengkap) tidak ikut diperiksa.
      await applyWebMigration(db);
      await applyHardeningMigration(db);
      await seedFixtures(db);
      await applyIntegrityMigration(db);
    }, 90_000);

    afterAll(async () => {
      await db.close();
    });

    const expectFailure = (session: Session, sql: string, params?: unknown[]) =>
      expectFailureWithDb(db, session, sql, params);

    const answersJson = (id: InstrumentId, answers: Record<string, number>) =>
      JSON.stringify(
        Object.entries(answers).map(([question_id, score]) => ({ question_id, score })),
      );

    const fullAnswers = (id: InstrumentId, valueFor: (index: number) => number) =>
      Object.fromEntries(INSTRUMENTS[id].questions.map((q, i) => [q.id, valueFor(i)]));

    /** PRNG deterministik supaya kegagalan bisa diulang. */
    function mulberry32(seed: number) {
      return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const randomAnswers = (id: InstrumentId, rng: () => number) =>
      Object.fromEntries(
        INSTRUMENTS[id].questions.map((q) => [
          q.id,
          q.options[Math.floor(rng() * q.options.length)]!.value,
        ]),
      );

    const INSERT = `insert into public.assessments (user_id, type, answers, total_score, category)
                    values ($1, $2, $3::jsonb, $4, $5) returning id, total_score, category`;

    // ===========================================================================
    describe('classify_assessment (SQL) = categoryFor (web) untuk SETIAP skor', () => {
      it.each(INSTRUMENT_IDS)('%s', async (id) => {
        const rows = await withSession(db, asService, (q) =>
          q<{ score: number; category: string }>(
            `select s as score, public.classify_assessment($1, s) as category
               from generate_series(0, $2::int) s order by s`,
            [id, maxScoreFor(id)],
          ),
        );
        expect(rows).toHaveLength(maxScoreFor(id) + 1);
        for (const row of rows) {
          expect(row.category, `${id} skor ${row.score}`).toBe(categoryFor(id, row.score));
        }
      });
    });

    // ===========================================================================
    describe('trigger menghitung ulang total_score dan category dari jawaban', () => {
      it.each(INSTRUMENT_IDS)(
        '%s: 120 kombinasi acak + ekstrem → hasil database = hasil kode web, walau klien mengirim nilai palsu',
        async (id) => {
          const rng = mulberry32(2026_10_13 + id.length);
          const cases: Record<string, number>[] = [
            fullAnswers(id, () => 0),
            fullAnswers(id, (i) =>
              Math.max(...INSTRUMENTS[id].questions[i]!.options.map((o) => o.value)),
            ),
            ...Array.from({ length: 118 }, () => randomAnswers(id, rng)),
          ];

          const rows = await withSession(db, asUser(ID.alice), async (q) => {
            const out: { total_score: number; category: string }[] = [];
            for (const answers of cases) {
              // Klien sengaja mengirim skor dan kategori yang SALAH.
              const [row] = await q<{ total_score: number; category: string }>(INSERT, [
                ID.alice,
                id,
                answersJson(id, answers),
                -1,
                'minimal',
              ]);
              out.push(row!);
            }
            return out;
          });

          rows.forEach((row, index) => {
            const expected = computeClinicalScore(id, cases[index]!);
            expect(row.total_score, `${id} kasus ${index}`).toBe(expected);
            expect(row.category, `${id} kasus ${index}`).toBe(categoryFor(id, expected));
          });
        },
        60_000,
      );

      it('SERANGAN: skor 0/minimal dikirim untuk jawaban yang berat → tersimpan sesuai jawaban', async () => {
        const answers = fullAnswers('phq9', () => 3);
        const [row] = await withSession(db, asUser(ID.alice), (q) =>
          q(INSERT, [ID.alice, 'phq9', answersJson('phq9', answers), 0, 'minimal']),
        );
        expect(row).toMatchObject({ total_score: 27, category: 'severe' });
      });

      it('PSS-10 mengikuti aturan Flutter: jawaban mentah disimpan, skor klinis membalik butir 4, 5, 7, 8', async () => {
        const allFour = fullAnswers('pss10', () => 4); // Flutter: 24 → "moderate"
        const allZero = fullAnswers('pss10', () => 0); // Flutter: 16 → "moderate"
        const [a, b] = await withSession(db, asUser(ID.alice), async (q) => [
          (await q(INSERT, [ID.alice, 'pss10', answersJson('pss10', allFour), 99, 'severe']))[0],
          (await q(INSERT, [ID.alice, 'pss10', answersJson('pss10', allZero), 99, 'severe']))[0],
        ]);
        expect(a).toMatchObject({ total_score: 24, category: 'moderate' });
        expect(b).toMatchObject({ total_score: 16, category: 'moderate' });
      });

      it('bentuk persis yang dikirim aplikasi Flutter (saveResult) diterima, termasuk completed_at dan sent_to_satusehat', async () => {
        const answers = fullAnswers('gad7', (i) => [2, 2, 2, 2, 1, 1, 1][i]!); // demo_data_seeder.dart
        const [row] = await withSession(db, asUser(ID.alice), (q) =>
          q(
            `insert into public.assessments
               (user_id, type, answers, total_score, category, completed_at, sent_to_satusehat)
             values ($1, 'gad7', $2::jsonb, 11, 'moderate', now(), false)
             returning total_score, category`,
            [ID.alice, answersJson('gad7', answers)],
          ),
        );
        expect(row).toEqual({ total_score: 11, category: 'moderate' });
      });

      it('butir tambahan di dalam elemen jawaban diabaikan, bukan ditolak', async () => {
        const answers = INSTRUMENTS.srq20.questions.map((q) => ({
          question_id: q.id,
          score: 1,
          answered_at: '2026-10-13',
        }));
        const [row] = await withSession(db, asUser(ID.alice), (q) =>
          q(INSERT, [ID.alice, 'srq20', JSON.stringify(answers), 0, 'minimal']),
        );
        expect(row).toMatchObject({ total_score: 20, category: 'severe' });
      });
    });

    // ===========================================================================
    describe('jawaban yang tidak valid ditolak (check_violation 23514)', () => {
      const phq = INSTRUMENTS.phq9.questions;
      const valid = () => phq.map((q) => ({ question_id: q.id, score: 1 }));

      const bad: Record<string, unknown> = {
        'kurang satu butir': valid().slice(1),
        'kelebihan satu butir': [...valid(), { question_id: 'phq9_10', score: 1 }],
        'butir ganda (satu hilang)': [...valid().slice(1), { question_id: 'phq9_2', score: 1 }],
        'nilai di atas rentang (4 untuk PHQ-9)': valid().map((a, i) =>
          i === 3 ? { ...a, score: 4 } : a,
        ),
        'nilai negatif': valid().map((a, i) => (i === 0 ? { ...a, score: -1 } : a)),
        'nilai pecahan': valid().map((a, i) => (i === 0 ? { ...a, score: 1.5 } : a)),
        'nilai berupa string': valid().map((a, i) => (i === 0 ? { ...a, score: '2' } : a)),
        'nilai null': valid().map((a, i) => (i === 0 ? { ...a, score: null } : a)),
        'tanpa question_id': valid().map((a, i) => (i === 0 ? { score: 1 } : a)),
        'butir instrumen lain': valid().map((a, i) =>
          i === 0 ? { ...a, question_id: 'gad7_1' } : a,
        ),
        'butir nomor nol': valid().map((a, i) => (i === 0 ? { ...a, question_id: 'phq9_0' } : a)),
        'butir di luar jumlah': valid().map((a, i) =>
          i === 0 ? { ...a, question_id: 'phq9_12' } : a,
        ),
        'bukan larik (objek)': { phq9_1: 1 },
        'bukan larik (null JSON)': null,
        'larik kosong': [],
        'elemen bukan objek': valid().map((a, i) => (i === 0 ? 3 : a)),
      };

      it.each(Object.entries(bad))('ditolak: %s', async (_name, answers) => {
        const failure = await expectFailure(asUser(ID.alice), INSERT, [
          ID.alice,
          'phq9',
          JSON.stringify(answers),
          9,
          'mild',
        ]);
        expect(failure.code).toBe('23514');
      });

      it('SRQ-20 hanya menerima 0 dan 1; PSS-10 menerima 0–4 tetapi bukan 5', async () => {
        const srq = INSTRUMENTS.srq20.questions.map((q) => ({ question_id: q.id, score: 2 }));
        expect(
          (
            await expectFailure(asUser(ID.alice), INSERT, [
              ID.alice,
              'srq20',
              JSON.stringify(srq),
              0,
              'minimal',
            ])
          ).code,
        ).toBe('23514');
        const pss = INSTRUMENTS.pss10.questions.map((q) => ({ question_id: q.id, score: 5 }));
        expect(
          (
            await expectFailure(asUser(ID.alice), INSERT, [
              ID.alice,
              'pss10',
              JSON.stringify(pss),
              0,
              'minimal',
            ])
          ).code,
        ).toBe('23514');
      });
    });

    // ===========================================================================
    describe('UPDATE: skor tidak bisa dipalsukan setelah tersimpan', () => {
      const createOwn = async (session: Session) =>
        withSession(db, session, async (q) => {
          const [row] = await q<{ id: string }>(INSERT, [
            ID.alice,
            'phq9',
            answersJson(
              'phq9',
              fullAnswers('phq9', () => 3),
            ),
            27,
            'severe',
          ]);
          return row!.id;
        });

      it('mengubah total_score/category dari klien dikembalikan ke nilai yang sesuai jawaban', async () => {
        await createOwn(asUser(ID.alice)); // memastikan insert normal berjalan
        const [row] = await withSession(db, asUser(ID.alice), async (q) => {
          const [created] = await q<{ id: string }>(INSERT, [
            ID.alice,
            'phq9',
            answersJson(
              'phq9',
              fullAnswers('phq9', () => 3),
            ),
            27,
            'severe',
          ]);
          return q(
            `update public.assessments set total_score = 0, category = 'minimal'
              where id = $1 returning total_score, category`,
            [created!.id],
          );
        });
        expect(row).toEqual({ total_score: 27, category: 'severe' });
      });

      it('mengubah jawaban menjadi tidak lengkap ditolak', async () => {
        const failure = await withSession(db, asUser(ID.alice), async (q) => {
          const [created] = await q<{ id: string }>(INSERT, [
            ID.alice,
            'phq9',
            answersJson(
              'phq9',
              fullAnswers('phq9', () => 1),
            ),
            9,
            'mild',
          ]);
          try {
            await q(`update public.assessments set answers = '[]'::jsonb where id = $1`, [
              created!.id,
            ]);
            return null;
          } catch (error) {
            return (error as { code?: string }).code;
          }
        });
        expect(failure).toBe('23514');
      });

      it('menandai terkirim ke SATUSEHAT tetap boleh, bahkan pada baris lama yang jawabannya tidak lengkap', async () => {
        // Baris fixture dibuat sebelum trigger dipasang: jawaban sengaja tidak lengkap.
        const rows = await withSession(db, asUser(ID.alice), (q) =>
          q(
            `update public.assessments set sent_to_satusehat = true
              where user_id = $1 and type = 'phq9' and answers = '[{"question_id":"phq9_1","score":2}]'::jsonb
              returning sent_to_satusehat`,
            [ID.alice],
          ),
        );
        expect(rows).toEqual([{ sent_to_satusehat: true }]);
      });
    });

    // ===========================================================================
    describe('sesi non-pengguna tidak disentuh (seed, SQL Editor, migrasi)', () => {
      it('service_role boleh menyisipkan data apa adanya', async () => {
        const [row] = await withSession(db, asService, (q) =>
          q(INSERT, [ID.alice, 'phq9', '[{"question_id":"phq9_1","score":2}]', 5, 'mild']),
        );
        expect(row).toMatchObject({ total_score: 5, category: 'mild' });
      });

      it('superuser tanpa klaim JWT (SQL Editor) juga lolos', async () => {
        const result = await db.query<{ total_score: number }>(
          `insert into public.assessments (user_id, type, answers, total_score, category)
           values ($1, 'phq9', '[]'::jsonb, 3, 'minimal') returning total_score`,
          [ID.alice],
        );
        expect(result.rows[0]!.total_score).toBe(3);
        await db.query(`delete from public.assessments where answers = '[]'::jsonb`);
      });
    });

    // ===========================================================================
    describe('alert krisis: trigger database = detektor web', () => {
      it.each(['phq9', 'srq20'] as const)(
        '%s: butir krisis 0/1/2/3 menghasilkan alert persis seperti yang diprediksi detektor web',
        async (id) => {
          const rng = mulberry32(777 + id.length);
          const crisisItem = id === 'phq9' ? 'phq9_9' : 'srq20_17';
          const top = id === 'phq9' ? 3 : 1;

          const results = await withSession(db, asUser(ID.alice), async (q) => {
            const out: { predicted: string | null; actual: string | null }[] = [];
            for (let n = 0; n < 40; n += 1) {
              const answers = randomAnswers(id, rng);
              answers[crisisItem] = n % (top + 1);
              const [created] = await q<{ id: string }>(INSERT, [
                ID.alice,
                id,
                answersJson(id, answers),
                0,
                'minimal',
              ]);
              const score = computeClinicalScore(id, answers);
              const predicted = detectAssessmentCrisis(id, answers)
                ? 'critical'
                : categoryFor(id, score) === 'severe'
                  ? 'high'
                  : null;
              const [alert] = await q<{ severity: string }>(
                `select severity from public.crisis_alerts where source = 'assessment' and source_id = $1`,
                [created!.id],
              );
              out.push({ predicted, actual: alert?.severity ?? null });
            }
            return out;
          });

          results.forEach((result, index) => {
            expect(result.actual, `${id} kasus ${index}`).toBe(result.predicted);
          });
          // Memastikan uji ini sungguh menjangkau kedua cabang.
          expect(results.some((r) => r.actual === 'critical')).toBe(true);
          expect(results.some((r) => r.actual === null)).toBe(true);
        },
        60_000,
      );

      it('kategori palsu dari klien tidak bisa memicu atau menghindari alert "high"', async () => {
        const severeAnswers = fullAnswers('gad7', () => 3); // total 21 → severe → high
        const mildAnswers = fullAnswers('gad7', (i) => (i < 5 ? 1 : 0)); // total 5 → mild
        const result = await withSession(db, asUser(ID.alice), async (q) => {
          const [forgedLow] = await q<{ id: string }>(INSERT, [
            ID.alice,
            'gad7',
            answersJson('gad7', severeAnswers),
            0,
            'minimal',
          ]);
          const [forgedHigh] = await q<{ id: string }>(INSERT, [
            ID.alice,
            'gad7',
            answersJson('gad7', mildAnswers),
            21,
            'severe',
          ]);
          const alerts = await q<{ source_id: string; severity: string }>(
            `select source_id, severity from public.crisis_alerts where source_id = any($1::uuid[])`,
            [[forgedLow!.id, forgedHigh!.id]],
          );
          return { forgedLow: forgedLow!.id, alerts };
        });
        expect(result.alerts).toEqual([{ source_id: result.forgedLow, severity: 'high' }]);
      });
    });

    // ===========================================================================
    describe('meta', () => {
      it('fungsi trigger tidak bisa dipanggil sebagai RPC', async () => {
        const [priv] = await withSession(db, asService, (q) =>
          q<{ anon: boolean; authed: boolean }>(
            `select has_function_privilege('anon', 'public.assessments_enforce_integrity()', 'execute') as anon,
                    has_function_privilege('authenticated', 'public.assessments_enforce_integrity()', 'execute') as authed`,
          ),
        );
        expect(priv).toEqual({ anon: false, authed: false });
      });

      it('idempotent: memuat ulang tidak error dan trigger tetap satu', async () => {
        await applyIntegrityMigration(db);
        const [row] = await withSession(db, asService, (q) =>
          q<{ n: number }>(
            `select count(*)::int n from pg_trigger
              where tgrelid = 'public.assessments'::regclass and tgname = 'trg_assessments_enforce_integrity'`,
          ),
        );
        expect(row!.n).toBe(1);
      });

      it('semua migrasi dimuat bersama dari awal tanpa galat (urutan cloud)', async () => {
        const fresh = await createBaseDatabase();
        try {
          await applyAllWebMigrations(fresh);
          const { rows } = await fresh.query<{ n: number }>(
            `select count(*)::int n from pg_tables where schemaname = 'public'`,
          );
          expect(rows[0]!.n).toBeGreaterThanOrEqual(26);
        } finally {
          await fresh.close();
        }
      }, 60_000);
    });
  },
);
