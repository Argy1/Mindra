// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CITIES,
  DEMO_ACCOUNTS,
  DEMO_EMAIL_DOMAIN,
  FACILITIES,
  PSYCHOLOGISTS,
} from '../../scripts/seed/catalog';
import {
  INSTRUMENTS,
  buildAnswers,
  categoryFor,
  maxScore,
  totalFromAnswers,
  type InstrumentType,
} from '../../scripts/seed/instruments';
import { generateUsers } from '../../scripts/seed/people';
import {
  HISTORY_DAYS,
  MOOD_TYPES,
  generateAssessments,
  generateDemoUserRecords,
  generateMood,
  generateSleep,
} from '../../scripts/seed/records';
import { createRng } from '../../scripts/seed/rng';
import {
  applyAllWebMigrations,
  asService,
  createBaseDatabase,
  hasMigrations,
  withSession,
} from '../db/harness';

const NOW = new Date('2026-10-13T08:00:00Z');
const TYPES: InstrumentType[] = ['phq9', 'gad7', 'pss10'];

describe('katalog data demo', () => {
  it('300 pengguna sintetis tersebar di 8 kota, Cianjur sengaja < 10 (peragaan k-anonymity)', () => {
    expect(CITIES.reduce((sum, city) => sum + city.users, 0)).toBe(300);
    expect(CITIES).toHaveLength(8);
    expect(CITIES.find((c) => c.city === 'Kab. Cianjur')?.users).toBeLessThan(10);
    expect(CITIES.filter((c) => c.city !== 'Kab. Cianjur').every((c) => c.users >= 10)).toBe(true);
  });

  it('20 faskes dan 10 psikolog dengan UUID tetap yang unik dan valid', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(FACILITIES).toHaveLength(20);
    expect(PSYCHOLOGISTS).toHaveLength(10);
    for (const id of [...FACILITIES.map((f) => f.id), ...PSYCHOLOGISTS.map((p) => p.id)])
      expect(id).toMatch(uuid);
    expect(new Set([...FACILITIES, ...PSYCHOLOGISTS].map((x) => x.id)).size).toBe(30);
  });

  it('faskes pertama adalah Puskesmas Bogor Tengah di Kota Bogor (dikelola akun demo faskes)', () => {
    expect(FACILITIES[0]).toMatchObject({
      name: 'Puskesmas Bogor Tengah',
      city: 'Kota Bogor',
      province: 'Jawa Barat',
    });
  });

  it('6 akun demo (satu per peran + calon psikolog), semuanya berdomain .test (tidak bisa menerima email sungguhan)', () => {
    expect(DEMO_ACCOUNTS.map((a) => a.role).sort()).toEqual([
      'admin',
      'caregiver',
      'facility_admin',
      'psychologist',
      'user',
      'user',
    ]);
    // Calon psikolog adalah satu-satunya akun dengan permintaan peran; ia tetap `user` sampai admin menyetujui.
    expect(DEMO_ACCOUNTS.filter((a) => a.requestedRole).map((a) => a.key)).toEqual(['applicant']);
    for (const account of DEMO_ACCOUNTS)
      expect(account.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).toBe(true);
    expect(DEMO_EMAIL_DOMAIN.endsWith('.test')).toBe(true);
  });

  it('10 psikolog demo punya profil singkat dan penilaian contoh yang wajar, tanpa klaim yang bisa dikira nyata', () => {
    for (const psychologist of PSYCHOLOGISTS) {
      expect(psychologist.bio.length, psychologist.fullName).toBeGreaterThan(80);
      expect(psychologist.bio.length).toBeLessThan(400);
      expect(psychologist.ratingAverage).toBeGreaterThanOrEqual(4.5);
      expect(psychologist.ratingAverage).toBeLessThanOrEqual(5);
      expect(psychologist.totalReviews).toBeGreaterThanOrEqual(5);
      // Aturan copy: tanpa tanda seru, emoji, atau istilah klinis di teks yang dibaca pengguna.
      expect(psychologist.bio).not.toMatch(/!|gangguan|diagnosa|pasien|\p{Extended_Pictographic}/u);
      // Tidak mengarang riwayat pendidikan, institusi, atau lisensi.
      expect(psychologist.bio).not.toMatch(
        /universitas|lulusan|alumni|sertifikat|izin praktik|tahun pengalaman/i,
      );
    }
    expect(new Set(PSYCHOLOGISTS.map((p) => p.bio)).size).toBe(10);
  });

  it('data faskes tidak memuat alamat atau telepon (tidak mengklaim data nyata)', () => {
    for (const facility of FACILITIES)
      expect(Object.keys(facility)).not.toEqual(expect.arrayContaining(['address', 'phone']));
  });
});

describe('generateUsers', () => {
  const users = generateUsers();

  it('deterministik: seed yang sama menghasilkan data yang sama persis', () => {
    expect(generateUsers()).toEqual(users);
    expect(generateUsers(1)).not.toEqual(users);
  });

  it('300 pengguna, jumlah per kota sesuai katalog, email unik dan berdomain demo', () => {
    expect(users).toHaveLength(300);
    for (const city of CITIES)
      expect(users.filter((u) => u.city === city.city)).toHaveLength(city.users);
    expect(new Set(users.map((u) => u.email)).size).toBe(300);
    for (const user of users) expect(user.email).toMatch(/^warga\.\d{3}@demo\.mindra\.test$/);
  });

  it('~2% menjawab pikiran menyakiti diri, tidak ada di kota kecil', () => {
    const ideation = users.filter((u) => u.ideation);
    expect(ideation).toHaveLength(6);
    expect(ideation.some((u) => u.city === 'Kab. Cianjur')).toBe(false);
  });

  it('tanggal lahir valid dan pengguna dewasa/remaja (lahir 1998–2008)', () => {
    for (const user of users) {
      expect(Number.isNaN(Date.parse(user.dateOfBirth))).toBe(false);
      const year = Number(user.dateOfBirth.slice(0, 4));
      expect(year).toBeGreaterThanOrEqual(1998);
      expect(year).toBeLessThanOrEqual(2008);
    }
  });
});

describe('instrumen sintetis', () => {
  it.each(TYPES)(
    '%s: jumlah jawaban (dengan butir terbalik) = total yang diminta, untuk SEMUA total 0…max',
    (type) => {
      const rng = createRng(7);
      for (let total = 0; total <= maxScore(type); total += 1) {
        const answers = buildAnswers(rng, type, total);
        expect(answers).toHaveLength(INSTRUMENTS[type].items);
        expect(totalFromAnswers(type, answers), `${type} total ${total}`).toBe(total);
        for (const answer of answers) {
          expect(answer.score).toBeGreaterThanOrEqual(0);
          expect(answer.score).toBeLessThanOrEqual(INSTRUMENTS[type].itemMax);
        }
      }
    },
  );

  it('PSS-10: butir 4, 5, 7, 8 disimpan mentah (terbalik), sama seperti aplikasi Flutter', () => {
    const answers = buildAnswers(createRng(1), 'pss10', 0); // total 0 → semua terhitung 0
    for (const answer of answers) {
      const number = Number(answer.question_id.split('_')[1]);
      expect(answer.score).toBe([4, 5, 7, 8].includes(number) ? 4 : 0);
    }
  });

  it('id pertanyaan memakai format Flutter (phq9_1 … phq9_9)', () => {
    const answers = buildAnswers(createRng(1), 'phq9', 10);
    expect(answers.map((a) => a.question_id)).toEqual(
      Array.from({ length: 9 }, (_, i) => `phq9_${i + 1}`),
    );
  });

  it('ideasi memaksa phq9_9 > 0 pada semua total, dan total dihitung dari jawaban', () => {
    for (let total = 0; total <= 27; total += 1) {
      const answers = buildAnswers(createRng(total), 'phq9', total, { ideation: true });
      expect(answers.find((a) => a.question_id === 'phq9_9')!.score).toBeGreaterThan(0);
      expect(totalFromAnswers('phq9', answers)).toBeGreaterThanOrEqual(Math.min(total, 1));
    }
  });

  it('tanpa ideasi, phq9_9 SELALU 0 untuk total sampai 24 (butir 9 memicu peringatan krisis kritis)', () => {
    // Sebelumnya poin acak sering jatuh ke butir 9, sehingga 257 dari 300 pengguna sintetis punya peringatan krisis.
    for (let total = 0; total <= 24; total += 1) {
      for (let seed = 0; seed < 25; seed += 1) {
        const answers = buildAnswers(createRng(seed * 31 + total), 'phq9', total);
        expect(
          answers.find((a) => a.question_id === 'phq9_9')!.score,
          `total ${total} seed ${seed}`,
        ).toBe(0);
        expect(totalFromAnswers('phq9', answers)).toBe(total);
      }
    }
  });

  it('tanpa ideasi, total 25-27 menyerap sisa ke butir 9 (semua butir lain penuh) dan totalnya tetap benar', () => {
    for (const total of [25, 26, 27]) {
      const answers = buildAnswers(createRng(total), 'phq9', total);
      expect(answers.find((a) => a.question_id === 'phq9_9')!.score).toBe(total - 24);
      expect(totalFromAnswers('phq9', answers)).toBe(total);
    }
  });

  it('GAD-7 dan PSS-10 tidak terpengaruh aturan butir 9', () => {
    for (const type of ['gad7', 'pss10'] as const) {
      for (let total = 0; total <= maxScore(type); total += 1) {
        expect(totalFromAnswers(type, buildAnswers(createRng(total), type, total))).toBe(total);
      }
    }
  });
});

describe('catatan harian sintetis', () => {
  const users = generateUsers();
  const user = users[0]!;
  const rng = () => createRng(99);
  const windowStart = NOW.getTime() - (HISTORY_DAYS + 1) * 86_400_000;

  it('mood: tipe valid, energi 1–5, dalam jendela 8 minggu, ~60–85% hari terisi', () => {
    const rows = generateMood(rng(), 'u1', 0.4, NOW);
    expect(rows.length).toBeGreaterThan(HISTORY_DAYS * 0.5);
    expect(rows.length).toBeLessThanOrEqual(HISTORY_DAYS);
    for (const row of rows) {
      expect(MOOD_TYPES).toContain(row.mood_type);
      expect(row.energy_level).toBeGreaterThanOrEqual(1);
      expect(row.energy_level).toBeLessThanOrEqual(5);
      expect(Date.parse(row.created_at)).toBeGreaterThan(windowStart);
      expect(Date.parse(row.created_at)).toBeLessThanOrEqual(NOW.getTime() + 86_400_000);
    }
  });

  it('tidur: bangun SETELAH tidur, durasi 3,5–10 jam, kualitas 1–5 (memenuhi constraint tabel)', () => {
    for (const row of generateSleep(rng(), 'u1', 0.4, NOW)) {
      const hours = (Date.parse(row.wake_time) - Date.parse(row.bedtime)) / 3_600_000;
      expect(hours).toBeGreaterThanOrEqual(3.4);
      expect(hours).toBeLessThanOrEqual(10.1);
      expect(row.quality).toBeGreaterThanOrEqual(1);
      expect(row.quality).toBeLessThanOrEqual(5);
    }
  });

  it('distress lebih tinggi → mood negatif dan skor PHQ-9 rata-rata lebih tinggi', () => {
    const negatives = (distress: number) =>
      generateMood(createRng(5), 'u', distress, NOW).filter((m) =>
        ['lelah', 'sedih', 'cemas'].includes(m.mood_type),
      ).length;
    expect(negatives(0.85)).toBeGreaterThan(negatives(0.1));

    const mean = (distress: number) => {
      const scores = Array.from({ length: 40 }, (_, i) =>
        generateAssessments(createRng(i), 'u', distress, NOW, { ideation: false })
          .filter((a) => a.type === 'phq9')
          .map((a) => a.total_score),
      ).flat();
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    };
    expect(mean(0.85)).toBeGreaterThan(mean(0.1) + 5);
  });

  it('asesmen: kategori = fungsi SQL, total = jumlah jawaban, tanggal dalam jendela', () => {
    const rows = generateAssessments(rng(), 'u1', user.distress, NOW, { ideation: false });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const row of rows) {
      expect(row.total_score).toBe(totalFromAnswers(row.type, row.answers));
      expect(row.category).toBe(categoryFor(row.type, row.total_score));
      expect(Date.parse(row.completed_at)).toBeGreaterThan(windowStart);
    }
  });

  it('tidak ada catatan bertanggal setelah "sekarang", juga bila seed dijalankan pagi hari', () => {
    const early = new Date('2026-10-13T01:00:00Z'); // 08.00 WIB: jam acak 09.00-22.00 hari ini belum tiba
    for (let seed = 0; seed < 20; seed += 1) {
      for (const row of generateMood(createRng(seed), 'u', 0.5, early))
        expect(Date.parse(row.created_at), `mood seed ${seed}`).toBeLessThanOrEqual(
          early.getTime(),
        );
      for (const row of generateSleep(createRng(seed), 'u', 0.5, early))
        expect(Date.parse(row.wake_time), `tidur seed ${seed}`).toBeLessThanOrEqual(
          early.getTime(),
        );
      for (const row of generateAssessments(createRng(seed), 'u', 0.5, early, { ideation: true }))
        expect(Date.parse(row.completed_at), `skrining seed ${seed}`).toBeLessThanOrEqual(
          early.getTime(),
        );
    }
  });

  it('rasio peringatan krisis wajar: bukan mayoritas pengguna, dan hampir semuanya dari skrining Berat atau ideasi', () => {
    // Aturan trigger database: butir 9 PHQ-9 > 0 (kritis) atau kategori Berat (tinggi).
    const rng = createRng(20261013);
    let alerts = 0;
    let usersWithAlert = 0;
    let critical = 0;
    for (const u of users) {
      const rows = generateAssessments(rng, 'u', u.distress, NOW, { ideation: u.ideation });
      const mine = rows.filter(
        (r) =>
          r.category === 'severe' ||
          (r.type === 'phq9' && r.answers.find((a) => a.question_id === 'phq9_9')!.score > 0),
      );
      alerts += mine.length;
      if (mine.length > 0) usersWithAlert += 1;
      critical += rows.filter(
        (r) => r.type === 'phq9' && r.answers.find((a) => a.question_id === 'phq9_9')!.score > 0,
      ).length;
    }
    expect(usersWithAlert / users.length).toBeLessThan(0.3); // sebelumnya 257 dari 300 (86%)
    expect(alerts / users.length).toBeLessThan(1); // sebelumnya ~2 per pengguna dalam 8 minggu
    expect(critical).toBeLessThanOrEqual(users.filter((u) => u.ideation).length + 2);
  });

  it('pengguna ber-ideasi mendapat PERSIS satu PHQ-9 dengan butir 9 > 0', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const rows = generateAssessments(createRng(seed), 'u1', 0.7, NOW, { ideation: true });
      const flagged = rows.filter(
        (a) => a.type === 'phq9' && a.answers.find((x) => x.question_id === 'phq9_9')!.score > 0,
      );
      expect(flagged.length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('akun demo pengguna meniru mockup beranda: PHQ-9 16→14→14→11 dan jam tidur 7,5 5 4,5 8 8,5 6 6,5', () => {
    const { assessments, sleep, mood } = generateDemoUserRecords(createRng(3), 'demo', NOW);
    expect(assessments.map((a) => a.total_score)).toEqual([16, 14, 14, 11]);
    expect(assessments.at(-1)!.category).toBe('moderate'); // "Sedang", seperti badge di mockup
    expect(sleep.map((s) => (Date.parse(s.wake_time) - Date.parse(s.bedtime)) / 3_600_000)).toEqual(
      [7.5, 5, 4.5, 8, 8.5, 6, 6.5],
    );
    expect(mood.map((m) => m.mood_type)).toEqual([
      'tenang',
      'lelah',
      'cemas',
      'bahagia',
      'syukur',
      'lelah',
    ]);
  });
});

describe.skipIf(!hasMigrations)('data demo vs skema sungguhan (PGlite)', () => {
  let db: PGlite;
  const users = generateUsers();
  const ids = new Map<number, string>();

  beforeAll(async () => {
    db = await createBaseDatabase();
    await applyAllWebMigrations(db);

    // Pengguna: auth.users → trigger membuat profiles; lalu isi kota/provinsi seperti skrip seed.
    for (const user of users) {
      const { rows } = await db.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
        [user.email, JSON.stringify({ full_name: user.name })],
      );
      ids.set(user.index, rows[0]!.id);
    }
    await db.query(
      `update public.profiles p set city = u.city, domicile_province = u.province, is_demo = true,
         share_region_stats = true
         from jsonb_to_recordset($1::jsonb) as u(id uuid, city text, province text) where p.id = u.id`,
      [
        JSON.stringify(
          users.map((u) => ({ id: ids.get(u.index), city: u.city, province: u.province })),
        ),
      ],
    );

    const rng = createRng(20261013);
    const mood = users.flatMap((u) => generateMood(rng, ids.get(u.index)!, u.distress, new Date()));
    const sleep = users.flatMap((u) =>
      generateSleep(rng, ids.get(u.index)!, u.distress, new Date()),
    );
    const assessments = users.flatMap((u) =>
      generateAssessments(rng, ids.get(u.index)!, u.distress, new Date(), { ideation: u.ideation }),
    );

    await db.query(
      `insert into public.mood_entries (user_id, mood_type, note, energy_level, triggers, created_at)
       select user_id, mood_type, note, energy_level, array(select jsonb_array_elements_text(triggers)), created_at
         from jsonb_to_recordset($1::jsonb) as x(user_id uuid, mood_type text, note text, energy_level int, triggers jsonb, created_at timestamptz)`,
      [JSON.stringify(mood)],
    );
    await db.query(
      `insert into public.sleep_entries (user_id, bedtime, wake_time, quality, notes)
       select user_id, bedtime, wake_time, quality, notes
         from jsonb_to_recordset($1::jsonb) as x(user_id uuid, bedtime timestamptz, wake_time timestamptz, quality int, notes text)`,
      [JSON.stringify(sleep)],
    );
    await db.query(
      `insert into public.assessments (user_id, type, answers, total_score, category, completed_at)
       select user_id, type, answers, total_score, category, completed_at
         from jsonb_to_recordset($1::jsonb) as x(user_id uuid, type text, answers jsonb, total_score int, category text, completed_at timestamptz)`,
      [JSON.stringify(assessments)],
    );
  }, 180_000);

  afterAll(async () => {
    await db.close();
  });

  it('seluruh data lolos constraint tabel (CHECK, FK, tipe)', async () => {
    const { rows } = await db.query<{ mood: number; sleep: number; assessments: number }>(
      `select (select count(*) from public.mood_entries)::int as mood,
              (select count(*) from public.sleep_entries)::int as sleep,
              (select count(*) from public.assessments)::int as assessments`,
    );
    expect(rows[0]!.mood).toBeGreaterThan(5000);
    expect(rows[0]!.sleep).toBeGreaterThan(5000);
    expect(rows[0]!.assessments).toBeGreaterThan(900);
  });

  it('peringatan krisis yang dibuat trigger asli: minoritas pengguna, kritis hanya untuk yang ber-ideasi', async () => {
    const { rows } = await db.query<{ total: number; users: number; critical: number }>(
      `select count(*)::int as total, count(distinct user_id)::int as users,
              count(*) filter (where severity = 'critical')::int as critical
         from public.crisis_alerts`,
    );
    const ideation = users.filter((u) => u.ideation).length;
    expect(rows[0]!.users / users.length).toBeLessThan(0.3);
    expect(rows[0]!.total / users.length).toBeLessThan(1);
    expect(rows[0]!.critical).toBeGreaterThanOrEqual(ideation);
    expect(rows[0]!.critical).toBeLessThanOrEqual(ideation + 2);
  });

  it('kategori yang disimpan seed SAMA dengan public.classify_assessment untuk setiap baris', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.assessments where category is distinct from public.classify_assessment(type, total_score)`,
    );
    expect(rows[0]!.n).toBe(0);
  });

  it('categoryFor sama dengan classify_assessment untuk SEMUA skor tiap instrumen', async () => {
    for (const type of TYPES) {
      for (let score = 0; score <= maxScore(type); score += 1) {
        const { rows } = await db.query<{ c: string }>(
          `select public.classify_assessment($1, $2) as c`,
          [type, score],
        );
        expect(categoryFor(type, score), `${type} ${score}`).toBe(rows[0]!.c);
      }
    }
  });

  it('trigger menerbitkan alert krisis untuk setiap PHQ-9 ber-ideasi (≥ 1 per pengguna ber-ideasi)', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(distinct user_id)::int as n from public.crisis_alerts where severity = 'critical'`,
    );
    expect(rows[0]!.n).toBeGreaterThanOrEqual(users.filter((u) => u.ideation).length);
  });

  it('facility_aggregate atas data seed: kota besar tampil, Cianjur (6 orang) disembunyikan, provinsi lain tak muncul', async () => {
    const [facility] = (
      await db.query<{ id: string }>(
        `insert into public.facilities (name, type, city, province) values ('Puskesmas Bogor Tengah', 'puskesmas', 'Kota Bogor', 'Jawa Barat') returning id`,
      )
    ).rows;

    const rows = await withSession(db, asService, (q) =>
      q<{
        city: string;
        suppressed: boolean;
        active_users: number | null;
        avg_phq9: string | null;
      }>(
        `select city, suppressed, active_users, avg_phq9 from public.facility_aggregate($1, current_date - 70, current_date + 1)`,
        [facility!.id],
      ),
    );

    const cities = new Set(rows.map((r) => r.city));
    expect(cities).toContain('Kota Bogor');
    expect(cities).toContain('Kab. Cianjur');
    expect(cities).not.toContain('Kota Surabaya'); // provinsi lain
    expect(cities).not.toContain('Kota Semarang');

    for (const row of rows.filter((r) => r.city === 'Kab. Cianjur')) {
      expect(row.suppressed).toBe(true);
      expect(row.active_users).toBeNull();
      expect(row.avg_phq9).toBeNull();
    }
    const bogor = rows.filter((r) => r.city === 'Kota Bogor' && !r.suppressed);
    expect(bogor.length).toBeGreaterThanOrEqual(6); // hampir semua dari 8 minggu lolos k ≥ 10
    expect(bogor.some((r) => r.avg_phq9 !== null)).toBe(true);
  });

  it('GRAFIK 8 MINGGU memperlihatkan "masa ujian": rata-rata PHQ-9 Bogor naik di pekan 5–7', async () => {
    const [facility] = (await db.query<{ id: string }>(`select id from public.facilities limit 1`))
      .rows;
    const rows = await withSession(db, asService, (q) =>
      q<{ week_start: string; avg_phq9: string | null }>(
        `select week_start::text, avg_phq9 from public.facility_aggregate($1, current_date - 70, current_date + 1)
          where city = 'Kota Bogor' and avg_phq9 is not null order by week_start`,
        [facility!.id],
      ),
    );
    const values = rows.map((r) => Number(r.avg_phq9));
    expect(values.length).toBeGreaterThanOrEqual(5);
    const peak = Math.max(...values);
    const early = values.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    expect(peak).toBeGreaterThan(early);
  });
});
