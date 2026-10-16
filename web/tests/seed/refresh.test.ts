// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS, PSYCHOLOGISTS } from '../../scripts/seed/catalog';
import { generateUsers } from '../../scripts/seed/people';
import {
  MAX_OPEN_CLIENT_ALERTS,
  buildSyntheticHistory,
  chunk,
  nextFridayConsultation,
  planAlertPatches,
  refreshDemoData,
  type AlertInput,
  type DataClient,
} from '../../scripts/seed/refresh';
import { planDemoUserFill, wibDateKey, wibToIso } from '../../scripts/seed/records';

/**
 * Bukti bahwa penyegaran data demo (a) tidak menyentuh akun login atau TOTP, (b) tidak menghapus catatan akun demo
 * bernama, (c) memperbaiki tanggal dan status peringatan krisis, dan (d) idempoten. Memakai klien tiruan yang meniru
 * perilaku PostgREST dan trigger `create_crisis_alert_from_assessment`, dan yang MELEMPAR bila kode mengakses apa pun
 * selain `from` (mis. `auth.admin.*`, `rpc`, `schema`).
 */

const NOW = new Date('2026-10-16T09:00:00Z'); // 16.00 WIB
const DAY = 86_400_000;

type Row = Record<string, unknown> & { id?: string };

interface LoggedOp {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  inFilters: Array<{ column: string; values: unknown[] }>;
}

/** Basis data tiruan: tabel = larik baris; mencatat setiap operasi. */
class FakeDb {
  tables: Record<string, Row[]> = {};
  ops: LoggedOp[] = [];
  constructor(private readonly clock: () => Date) {}

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  /** Klien yang HANYA punya `from`; properti lain melempar galat. */
  client(): DataClient {
    const from = (table: string) => new Query(this, table);
    return new Proxy({ from } as object, {
      get(target, property) {
        if (property === 'from') return from;
        throw new Error(`akses terlarang pada klien penyegaran: ${String(property)}`);
      },
    }) as unknown as DataClient;
  }

  /** Meniru trigger `create_crisis_alert_from_assessment` (skrining Berat atau butir 9 PHQ-9 > 0). */
  onAssessmentInserted(row: Row): void {
    const answers = (row.answers ?? []) as Array<{ question_id: string; score: number }>;
    const ideation =
      row.type === 'phq9' && (answers.find((a) => a.question_id === 'phq9_9')?.score ?? 0) > 0;
    const severity = ideation ? 'critical' : row.category === 'severe' ? 'high' : null;
    if (!severity) return;
    this.rows('crisis_alerts').push({
      id: randomUUID(),
      user_id: row.user_id,
      source: 'assessment',
      source_id: row.id,
      severity,
      status: 'open',
      acknowledged_by: null,
      acknowledged_at: null,
      created_at: this.clock().toISOString(), // trigger memakai now(), bukan waktu skrining
    });
  }
}

class Query implements PromiseLike<{ data: unknown; count: number | null; error: null }> {
  private op: LoggedOp['op'] = 'select';
  private payload: Row[] = [];
  private patch: Row = {};
  private returning = false;
  private head = false;
  private wantCount = false;
  private from = 0;
  private to = Number.POSITIVE_INFINITY;
  private readonly filters: Array<(row: Row) => boolean> = [];
  private readonly inFilters: LoggedOp['inFilters'] = [];

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (this.op === 'insert') this.returning = true;
    else {
      this.head = options?.head === true;
      this.wantCount = options?.count === 'exact';
    }
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.inFilters.push({ column, values });
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  gte(column: string, value: string) {
    this.filters.push((row) => Date.parse(String(row[column])) >= Date.parse(value));
    return this;
  }
  gt(column: string, value: string) {
    this.filters.push((row) => Date.parse(String(row[column])) > Date.parse(value));
    return this;
  }
  order() {
    return this;
  }
  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }

  then<R1, R2>(
    onfulfilled?:
      | ((value: { data: unknown; count: number | null; error: null }) => R1 | PromiseLike<R1>)
      | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }

  private execute() {
    const db = this.db;
    db.ops.push({ table: this.table, op: this.op, inFilters: this.inFilters });
    const rows = db.rows(this.table);
    const matches = () => rows.filter((row) => this.filters.every((filter) => filter(row)));

    if (this.op === 'insert') {
      const inserted = this.payload.map((row) => ({ id: randomUUID(), ...row }));
      rows.push(...inserted);
      if (this.table === 'assessments') for (const row of inserted) db.onAssessmentInserted(row);
      return { data: this.returning ? inserted : null, count: null, error: null as null };
    }
    if (this.op === 'update') {
      for (const row of matches()) Object.assign(row, this.patch);
      return { data: null, count: null, error: null as null };
    }
    if (this.op === 'delete') {
      const doomed = new Set(matches());
      db.tables[this.table] = rows.filter((row) => !doomed.has(row));
      return { data: null, count: null, error: null as null };
    }
    const found = matches();
    return {
      data: this.head ? null : found.slice(this.from, this.to + 1),
      count: this.wantCount ? found.length : null,
      error: null as null,
    };
  }
}

// ─── Keadaan awal: demo yang sudah pernah di-seed beberapa hari lalu ──────────────────────────────

const SEEDED_AT = new Date(NOW.getTime() - 3 * DAY);
const users = generateUsers();

function buildInitialDb() {
  const db = new FakeDb(() => NOW);
  const accountId = (key: string) => `acct-${key}`;
  const syntheticId = (index: number) => `syn-${index}`;

  db.rows('profiles').push(
    ...DEMO_ACCOUNTS.map((account) => ({
      id: accountId(account.key),
      email: account.email,
      is_demo: true,
      role: account.role,
    })),
    ...users.map((user) => ({ id: syntheticId(user.index), email: user.email, is_demo: true })),
    // Pengguna sungguhan (bukan demo): tidak boleh tersentuh.
    { id: 'real-1', email: 'orang.nyata@example.com', is_demo: false },
  );
  db.rows('psychologists').push(
    ...PSYCHOLOGISTS.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      bio: null,
      rating_average: 0,
      total_reviews: 0,
    })),
  );

  // Riwayat lama (seed 3 hari lalu): peringatan bertanggal waktu seed, seperti di cloud sebelum perbaikan.
  const old = new FakeDb(() => SEEDED_AT);
  const idByIndex = new Map(users.map((u) => [u.index, syntheticId(u.index)] as const));
  const history = buildSyntheticHistory(users, idByIndex, SEEDED_AT);
  db.rows('mood_entries').push(...history.mood.map((row) => ({ id: randomUUID(), ...row })));
  db.rows('sleep_entries').push(...history.sleep.map((row) => ({ id: randomUUID(), ...row })));
  for (const row of history.assessments) {
    const inserted = { id: randomUUID(), ...row };
    db.rows('assessments').push(inserted);
    old.onAssessmentInserted(inserted);
  }
  db.rows('crisis_alerts').push(...old.rows('crisis_alerts'));

  // Klien psikolog demo, seperti pada `pnpm seed`: akun pengguna + 7 warga Kota Bogor + 2 yang ber-ideasi.
  const bogor = users.filter((u) => u.city === 'Kota Bogor').slice(0, 7);
  const ideation = users.filter((u) => u.ideation && u.city === 'Kota Bogor').slice(0, 2);
  const clients = [
    accountId('user'),
    ...new Set([...bogor, ...ideation].map((u) => syntheticId(u.index))),
  ];
  db.rows('care_links').push(
    ...clients.map((patient) => ({
      patient_id: patient,
      psychologist_id: PSYCHOLOGISTS[0]!.id,
      status: 'active',
    })),
  );

  // Catatan "buatan orang" di akun pengguna demo (mis. pemilik mencoba aplikasi): HARUS selamat dari penyegaran.
  const humanMoodAt = new Date(NOW.getTime() - 5 * 3_600_000 - 17_000).toISOString();
  db.rows('mood_entries').push({
    id: 'human-mood',
    user_id: accountId('user'),
    mood_type: 'cemas',
    note: 'catatan sungguhan dari orang',
    energy_level: 2,
    triggers: [],
    created_at: humanMoodAt,
  });
  db.rows('assessments').push({
    id: 'human-assessment',
    user_id: accountId('user'),
    type: 'phq9',
    answers: Array.from({ length: 9 }, (_, i) => ({
      question_id: `phq9_${i + 1}`,
      score: i === 8 ? 1 : 0,
    })),
    total_score: 1,
    category: 'minimal',
    completed_at: new Date(NOW.getTime() - 3_600_000).toISOString(),
  });
  db.onAssessmentInserted(db.rows('assessments').at(-1)!); // peringatan kritis "buatan orang" baru saja
  const humanAlert = db.rows('crisis_alerts').at(-1)!;
  humanAlert.created_at = new Date(NOW.getTime() - 3_600_000).toISOString();
  db.rows('consultations').push({
    id: 'old-consult',
    user_id: accountId('user'),
    psychologist_id: PSYCHOLOGISTS[0]!.id,
    scheduled_at: new Date(NOW.getTime() - 20 * DAY).toISOString(),
    status: 'completed',
  });
  return {
    db,
    accountId,
    syntheticId,
    clients: new Set(clients),
    humanAlertId: humanAlert.id as string,
  };
}

const idsOf = (rows: Row[]) => new Set(rows.map((row) => row.id as string));

describe('refreshDemoData: tidak menyentuh akun login dan TOTP', () => {
  it('klien penyegaran hanya punya `from`: akses ke auth, rpc, atau schema melempar galat', async () => {
    const { db } = buildInitialDb();
    const client = db.client();
    expect(() => (client as unknown as { auth: unknown }).auth).toThrow(/akses terlarang/);
    expect(() => (client as unknown as { rpc: unknown }).rpc).toThrow(/akses terlarang/);
    expect(() => (client as unknown as { schema: unknown }).schema).toThrow(/akses terlarang/);
    await expect(refreshDemoData(client, { now: NOW })).resolves.toBeDefined(); // berjalan penuh tanpa itu semua
  });

  it('tidak ada operasi tulis pada profil, tautan perawatan, faskes, atau akun: hanya tabel data yang diizinkan', async () => {
    const { db, syntheticId } = buildInitialDb();
    const profilesBefore = JSON.stringify(db.rows('profiles'));
    const careLinksBefore = JSON.stringify(db.rows('care_links'));
    await refreshDemoData(db.client(), { now: NOW });

    const writes = db.ops.filter((op) => op.op !== 'select');
    const allowedWrites: Record<string, Array<LoggedOp['op']>> = {
      mood_entries: ['insert', 'delete'],
      sleep_entries: ['insert', 'delete'],
      assessments: ['insert', 'delete'],
      crisis_alerts: ['update', 'delete'],
      psychologists: ['update'],
      consultations: ['insert'],
    };
    for (const op of writes) {
      expect(allowedWrites[op.table], `tabel ${op.table} tidak boleh ditulis`).toBeDefined();
      expect(allowedWrites[op.table], `${op.op} pada ${op.table}`).toContain(op.op);
    }
    // Tidak ada tulisan ke profiles / care_links / facilities / caregiver_relationships / facility_admins.
    for (const table of [
      'profiles',
      'care_links',
      'facilities',
      'caregiver_relationships',
      'facility_admins',
    ]) {
      expect(
        writes.filter((op) => op.table === table),
        table,
      ).toEqual([]);
    }
    expect(JSON.stringify(db.rows('profiles'))).toBe(profilesBefore);
    expect(JSON.stringify(db.rows('care_links'))).toBe(careLinksBefore);

    // Semua penghapusan hanya menarget pengguna SINTETIS, tidak pernah akun bernama maupun pengguna nyata.
    const synthetic = new Set(users.map((u) => syntheticId(u.index)));
    const deletes = writes.filter((op) => op.op === 'delete');
    expect(deletes.length).toBeGreaterThan(0);
    for (const op of deletes) {
      expect(op.inFilters.length, `${op.table} dihapus tanpa penyaring pengguna`).toBeGreaterThan(
        0,
      );
      for (const filter of op.inFilters) {
        expect(filter.column).toBe('user_id');
        for (const value of filter.values)
          expect(synthetic.has(value as string), String(value)).toBe(true);
      }
    }
  });

  it('kode penyegaran tidak menyebut API akun (auth, admin, deleteUser, mfa, rpc, schema)', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../scripts/seed/refresh.ts', import.meta.url)),
      'utf8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const forbidden of [
      '.auth',
      'admin.',
      'deleteUser',
      'createUser',
      'updateUserById',
      'mfa',
      '.rpc(',
      '.schema(',
    ]) {
      expect(source, `refresh.ts memuat "${forbidden}"`).not.toContain(forbidden);
    }
    // Satu-satunya tipe klien yang diterima adalah yang hanya punya `from`.
    expect(source).toContain("export type DataClient = Pick<SupabaseClient, 'from'>;");
  });
});

describe('refreshDemoData: data demo yang masuk akal', () => {
  it('catatan akun demo bernama TIDAK ada yang dihapus; celah 7 hari terakhir terisi; catatan buatan orang selamat', async () => {
    const { db, accountId } = buildInitialDb();
    const mine = (table: string) =>
      db.rows(table).filter((row) => row.user_id === accountId('user'));
    const before = { mood: idsOf(mine('mood_entries')), assessments: idsOf(mine('assessments')) };

    await refreshDemoData(db.client(), { now: NOW });

    for (const id of before.mood) expect(idsOf(mine('mood_entries')).has(id)).toBe(true);
    for (const id of before.assessments) expect(idsOf(mine('assessments')).has(id)).toBe(true);
    expect(mine('mood_entries').find((row) => row.id === 'human-mood')?.note).toBe(
      'catatan sungguhan dari orang',
    );

    // 7 hari WIB terakhir (termasuk hari ini) masing-masing punya satu catatan mood.
    const moodDays = new Set(
      mine('mood_entries').map((row) => wibDateKey(row.created_at as string)),
    );
    for (let daysAgo = 0; daysAgo <= 6; daysAgo += 1) {
      expect(moodDays.has(wibDateKey(wibToIso(NOW, daysAgo, 12))), `hari -${daysAgo}`).toBe(true);
    }
    // Tidak ada catatan bertanggal setelah sekarang.
    for (const table of ['mood_entries', 'assessments']) {
      for (const row of db.rows(table)) {
        expect(Date.parse(String(row.created_at ?? row.completed_at)), table).toBeLessThanOrEqual(
          NOW.getTime(),
        );
      }
    }
  });

  it('skrining dan peringatan pengguna sintetis dibangun ulang relatif terhadap hari ini', async () => {
    const { db, syntheticId } = buildInitialDb();
    const syntheticIds = new Set(users.map((u) => syntheticId(u.index)));
    await refreshDemoData(db.client(), { now: NOW });

    const assessments = db
      .rows('assessments')
      .filter((row) => syntheticIds.has(row.user_id as string));
    const newest = Math.max(...assessments.map((row) => Date.parse(row.completed_at as string)));
    expect(NOW.getTime() - newest).toBeLessThan(15 * DAY); // seed lama berhenti 3 hari lalu; kini berakhir hari ini
    const moods = db.rows('mood_entries').filter((row) => syntheticIds.has(row.user_id as string));
    const lastWeek = moods.filter(
      (row) => NOW.getTime() - Date.parse(row.created_at as string) <= 7 * DAY,
    );
    expect(lastWeek.length).toBeGreaterThan(users.length * 3); // ±72% hari terisi: hampir semua punya catatan 7 hari terakhir
  });

  it('peringatan: tanggalnya = waktu skrining, klien psikolog paling banyak 3 yang terbuka, sisanya selesai ditangani', async () => {
    const { db, clients, syntheticId, humanAlertId } = buildInitialDb();
    await refreshDemoData(db.client(), { now: NOW });

    const assessmentById = new Map(db.rows('assessments').map((row) => [row.id as string, row]));
    const alerts = db.rows('crisis_alerts');
    const syntheticIds = new Set(users.map((u) => syntheticId(u.index)));
    for (const alert of alerts) {
      if (!syntheticIds.has(alert.user_id as string)) continue;
      const source = assessmentById.get(alert.source_id as string);
      expect(source, 'peringatan tanpa skrining sumber').toBeDefined();
      expect(alert.created_at, 'created_at = waktu skrining').toBe(source!.completed_at);
    }

    const clientAlerts = alerts.filter((alert) => clients.has(alert.user_id as string));
    const open = clientAlerts.filter((alert) => alert.status === 'open');
    expect(clientAlerts.length).toBeGreaterThanOrEqual(2);
    expect(open.length).toBe(Math.min(MAX_OPEN_CLIENT_ALERTS, clientAlerts.length));
    // Yang tetap terbuka adalah yang TERBARU, termasuk peringatan "buatan orang" satu jam lalu.
    const newestOpen = Math.min(...open.map((alert) => Date.parse(alert.created_at as string)));
    for (const alert of clientAlerts.filter((a) => a.status !== 'open')) {
      expect(Date.parse(alert.created_at as string)).toBeLessThanOrEqual(newestOpen);
      expect(alert.status).toBe('resolved');
      expect(alert.acknowledged_by).toBe('acct-psychologist');
      expect(Date.parse(alert.acknowledged_at as string)).toBeGreaterThanOrEqual(
        Date.parse(alert.created_at as string),
      );
      expect(Date.parse(alert.acknowledged_at as string)).toBeLessThanOrEqual(NOW.getTime());
    }
    expect(open.some((alert) => alert.id === humanAlertId)).toBe(true);

    // Pengguna sintetis lain: terbuka hanya yang baru (<= 2 hari).
    for (const alert of alerts.filter(
      (a) => syntheticIds.has(a.user_id as string) && !clients.has(a.user_id as string),
    )) {
      const ageDays = (NOW.getTime() - Date.parse(alert.created_at as string)) / DAY;
      if (alert.status === 'open') expect(ageDays).toBeLessThanOrEqual(2.01);
      else expect(alert.acknowledged_by).toBeNull();
    }
  });

  it('rasio peringatan per pengguna wajar (bukan puluhan peringatan per pekan untuk satu kota kecil)', async () => {
    const { db, syntheticId } = buildInitialDb();
    await refreshDemoData(db.client(), { now: NOW });
    const bogorIds = new Set(
      users.filter((u) => u.city === 'Kota Bogor').map((u) => syntheticId(u.index)),
    );
    const lastTwoWeeks = db
      .rows('crisis_alerts')
      .filter(
        (a) =>
          bogorIds.has(a.user_id as string) &&
          NOW.getTime() - Date.parse(a.created_at as string) <= 14 * DAY,
      );
    expect(lastTwoWeeks.length / bogorIds.size).toBeLessThan(0.4); // di cloud sebelumnya 130 untuk 65 pengguna (2,0)
    expect(db.rows('crisis_alerts').length / users.length).toBeLessThan(1);
  });

  it('psikolog demo mendapat profil singkat dan penilaian contoh; baris non-demo tidak tersentuh', async () => {
    const { db } = buildInitialDb();
    await refreshDemoData(db.client(), { now: NOW });
    for (const row of db.rows('psychologists')) {
      const seed = PSYCHOLOGISTS.find((p) => p.id === row.id)!;
      expect(row.bio).toBe(seed.bio);
      expect(row.rating_average).toBe(seed.ratingAverage);
      expect(row.total_reviews).toBe(seed.totalReviews);
    }
    expect(db.rows('profiles').find((row) => row.id === 'real-1')).toEqual({
      id: 'real-1',
      email: 'orang.nyata@example.com',
      is_demo: false,
    });
  });

  it('menambah satu konsultasi mendatang bila belum ada, dan tidak menambah lagi pada jalan berikutnya', async () => {
    const { db, accountId } = buildInitialDb();
    await refreshDemoData(db.client(), { now: NOW });
    const upcoming = () =>
      db
        .rows('consultations')
        .filter(
          (c) =>
            c.user_id === accountId('user') && Date.parse(c.scheduled_at as string) > NOW.getTime(),
        );
    expect(upcoming()).toHaveLength(1);
    expect(new Date(upcoming()[0]!.scheduled_at as string).getUTCDay()).toBe(5); // Jumat
    await refreshDemoData(db.client(), { now: NOW });
    expect(upcoming()).toHaveLength(1);
  });

  it('idempoten: dijalankan dua kali pada hari yang sama menghasilkan keadaan yang sama (dan catatan akun tidak bertambah)', async () => {
    const { db, accountId } = buildInitialDb();
    const summarize = () => ({
      mood: db.rows('mood_entries').length,
      sleep: db.rows('sleep_entries').length,
      assessments: db.rows('assessments').length,
      alerts: db.rows('crisis_alerts').length,
      open: db.rows('crisis_alerts').filter((a) => a.status === 'open').length,
      resolved: db.rows('crisis_alerts').filter((a) => a.status === 'resolved').length,
      consultations: db.rows('consultations').length,
      pengguna: db.rows('mood_entries').filter((r) => r.user_id === accountId('user')).length,
    });
    await refreshDemoData(db.client(), { now: NOW });
    const first = summarize();
    await refreshDemoData(db.client(), { now: NOW });
    expect(summarize()).toEqual(first);
  });

  it('--dry-run tidak menulis apa pun', async () => {
    const { db } = buildInitialDb();
    const snapshot = JSON.stringify(db.tables);
    const lines: string[] = [];
    const summary = await refreshDemoData(db.client(), {
      now: NOW,
      dryRun: true,
      log: (m) => lines.push(m),
    });
    expect(summary.dryRun).toBe(true);
    expect(db.ops.filter((op) => op.op !== 'select')).toEqual([]);
    expect(JSON.stringify(db.tables)).toBe(snapshot);
    expect(lines.join('\n')).toContain('Akun login tidak disentuh');
  });

  it('menolak berjalan bila data demo belum ada (tidak membuat akun)', async () => {
    const db = new FakeDb(() => NOW);
    await expect(refreshDemoData(db.client(), { now: NOW })).rejects.toThrow(/data demo belum ada/);
  });
});

describe('planAlertPatches (murni)', () => {
  const alert = (overrides: Partial<AlertInput> & { id: string }): AlertInput => ({
    userId: 'u',
    sourceId: null,
    status: 'open',
    createdAt: NOW.toISOString(),
    ...overrides,
  });

  it('created_at diperbaiki ke waktu skrining; peringatan tanpa sumber yang dikenal tidak diubah tanggalnya', () => {
    const patches = planAlertPatches({
      alerts: [alert({ id: 'a1', sourceId: 's1' }), alert({ id: 'a2', sourceId: 'tak-dikenal' })],
      completedAt: new Map([['s1', '2026-09-20T13:00:00.000Z']]),
      clientIds: new Set(),
      responderId: null,
      now: NOW,
    });
    expect(patches.find((p) => p.id === 'a1')?.patch.created_at).toBe('2026-09-20T13:00:00.000Z');
    expect(patches.find((p) => p.id === 'a2')?.patch.created_at).toBeUndefined();
  });

  it('klien: paling banyak `maxOpen` terbaru tetap terbuka; urutan masukan tidak berpengaruh', () => {
    const alerts = Array.from({ length: 6 }, (_, i) =>
      alert({ id: `c${i}`, userId: 'klien', sourceId: `s${i}` }),
    );
    const completedAt = new Map(
      alerts.map((a, i) => [a.sourceId!, new Date(NOW.getTime() - i * DAY).toISOString()]),
    );
    const run = (input: AlertInput[]) =>
      planAlertPatches({
        alerts: input,
        completedAt,
        clientIds: new Set(['klien']),
        responderId: 'psikolog',
        now: NOW,
        maxOpen: 3,
      });
    const resolved = (patches: ReturnType<typeof run>) =>
      patches
        .filter((p) => p.patch.status === 'resolved')
        .map((p) => p.id)
        .sort();
    expect(resolved(run(alerts))).toEqual(['c3', 'c4', 'c5']); // c0, c1, c2 (terbaru) tetap terbuka
    expect(resolved(run([...alerts].reverse()))).toEqual(['c3', 'c4', 'c5']);
  });

  it('tidak pernah membuka kembali peringatan yang sudah ditangani, dan yang sudah ditangani tidak dihitung terbuka', () => {
    const patches = planAlertPatches({
      alerts: [
        alert({ id: 'x', userId: 'klien', sourceId: 's1', status: 'resolved' }),
        alert({ id: 'y', userId: 'klien', sourceId: 's2', status: 'acknowledged' }),
        alert({ id: 'z', userId: 'klien', sourceId: 's3' }),
      ],
      completedAt: new Map(),
      clientIds: new Set(['klien']),
      responderId: 'psikolog',
      now: NOW,
      maxOpen: 1,
    });
    expect(patches).toEqual([]); // satu yang terbuka sudah <= batas; yang lain dibiarkan
  });

  it('waktu penanganan selalu setelah dibuat dan tidak melewati sekarang', () => {
    const created = new Date(NOW.getTime() - 30 * 60_000).toISOString(); // 30 menit lalu
    const [patch] = planAlertPatches({
      alerts: [alert({ id: 'baru', userId: 'klien', sourceId: 's', createdAt: created })],
      completedAt: new Map(),
      clientIds: new Set(['klien']),
      responderId: 'psikolog',
      now: NOW,
      maxOpen: 0,
    });
    const handled = Date.parse(patch!.patch.acknowledged_at!);
    expect(handled).toBeGreaterThanOrEqual(Date.parse(created));
    expect(handled).toBeLessThanOrEqual(NOW.getTime());
  });
});

describe('planDemoUserFill (murni)', () => {
  const fill = (moodDays: string[] = [], sleepDays: string[] = []) =>
    planDemoUserFill('u', NOW, { moodDays: new Set(moodDays), sleepDays: new Set(sleepDays) });

  it('mengisi 7 hari, tetapi tidak membuat catatan bertanggal setelah sekarang', () => {
    // NOW = 16.00 WIB: mood hari ini dijadwalkan 20.15 WIB (belum tiba) sehingga 6; tidur hari ini berakhir 05.30 WIB (sudah lewat) sehingga 7.
    const plan = fill();
    expect(plan.mood).toHaveLength(6);
    expect(plan.sleep).toHaveLength(7);
    for (const row of plan.mood)
      expect(Date.parse(row.created_at)).toBeLessThanOrEqual(NOW.getTime());
    for (const row of plan.sleep)
      expect(Date.parse(row.wake_time)).toBeLessThanOrEqual(NOW.getTime());
  });

  it('melewati hari yang sudah punya catatan, dan tidak menyentuh hari lain', () => {
    const today = wibDateKey(wibToIso(NOW, 2, 12));
    const plan = fill([today], []);
    expect(plan.mood.map((row) => wibDateKey(row.created_at))).not.toContain(today);
    expect(fill([], []).mood.length - plan.mood.length).toBe(1);
  });

  it('idempoten: setelah rencana diterapkan, rencana berikutnya kosong', () => {
    const first = fill();
    const second = fill(
      first.mood.map((row) => wibDateKey(row.created_at)),
      first.sleep.map((row) => wibDateKey(row.wake_time)),
    );
    expect(second).toEqual({ mood: [], sleep: [] });
  });
});

describe('nextFridayConsultation dan chunk', () => {
  it('selalu Jumat 15.00 WIB, setelah sekarang, dalam 7 hari', () => {
    for (let day = 0; day < 14; day += 1) {
      const now = new Date(NOW.getTime() + day * DAY);
      const at = new Date(nextFridayConsultation(now));
      expect(at.getUTCDay()).toBe(5);
      expect(at.getUTCHours()).toBe(8);
      expect(at.getTime()).toBeGreaterThan(now.getTime());
      expect(at.getTime() - now.getTime()).toBeLessThanOrEqual(7 * DAY);
    }
  });

  it('chunk memecah daftar tanpa kehilangan elemen (daftar `in (...)` di URL harus pendek)', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
