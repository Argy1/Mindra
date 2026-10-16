/**
 * Isi dan segarkan DATA demo (bukan akun). Dipakai oleh `pnpm seed` (pengisian awal) dan `pnpm seed --refresh`.
 *
 * JAMINAN KEAMANAN AKUN: modul ini hanya menerima `DataClient` = `Pick<SupabaseClient, 'from'>`. Klien itu tidak
 * punya `auth`, `rpc`, maupun `schema`, jadi kode di sini TIDAK BISA membuat, mengubah, atau menghapus akun login,
 * kata sandi, maupun faktor verifikasi dua langkah (TOTP) milik psikolog, admin faskes, dan admin. Tes
 * (`tests/seed/refresh.test.ts`) mencatat setiap panggilan dan memastikannya.
 *
 * Penyegaran:
 *   - pengguna sintetis (`warga.NNN@…`, tidak ada manusia di baliknya): catatan mood, tidur, dan skrining beserta
 *     peringatan krisisnya dibangun ulang relatif terhadap "sekarang" (deterministik, jadi hasilnya sama untuk hari yang sama);
 *   - akun demo bernama (mis. `pengguna@…`): TIDAK ADA yang dihapus. Hanya celah 7 hari terakhir yang diisi;
 *   - peringatan krisis: `created_at` = waktu skrining, yang lama ditandai selesai ditangani, dan paling banyak 3
 *     peringatan terbuka untuk klien psikolog demo;
 *   - profil singkat dan penilaian contoh untuk 10 psikolog demo.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_ACCOUNTS, DEMO_EMAIL_DOMAIN, PSYCHOLOGISTS, type DemoAccount } from './catalog';
import { generateUsers, type SyntheticUser } from './people';
import {
  generateAssessments,
  generateMood,
  generateSleep,
  planDemoUserFill,
  wibDateKey,
  type AssessmentRow,
  type MoodRow,
  type SleepRow,
} from './records';
import { createRng } from './rng';

/** Klien data tanpa akses akun login: hanya `from`. Lihat catatan keamanan di atas. */
export type DataClient = Pick<SupabaseClient, 'from'>;

const CONCURRENCY = 8;
const INSERT_CHUNK = 500;
/** Daftar `in (...)` di URL PostgREST harus pendek; 600 UUID sekaligus membuat permintaan ditolak diam-diam. */
const IN_CHUNK = 50;
const SEED_VALUE = 20261013;

/** Banyak peringatan terbuka yang dibiarkan untuk klien psikolog demo (dasbor tidak boleh penuh peringatan). */
export const MAX_OPEN_CLIENT_ALERTS = 3;
/** Peringatan pengguna sintetis yang lebih tua dari ini dianggap sudah ditangani. */
export const SYNTHETIC_OPEN_WINDOW_DAYS = 2;

const SYNTHETIC_EMAIL = new RegExp(`^warga\\.(\\d{3})@${DEMO_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`);

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size)
    out.push(items.slice(start, start + size));
  return out;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index] as T);
      }
    }),
  );
  return results;
}

class RefreshError extends Error {}
const must = (error: { code?: string; message: string } | null, what: string): void => {
  if (error) throw new RefreshError(`${what}: ${error.code ?? ''} ${error.message}`.trim());
};

// ─── Siapa saja akun demo ──────────────────────────────────────────────────────

export interface DemoPeople {
  /** index pengguna sintetis (1-based, sama dengan `generateUsers`) → id profil. */
  synthetic: Map<number, string>;
  named: Map<DemoAccount['key'], string>;
}

export async function loadDemoPeople(db: DataClient): Promise<DemoPeople> {
  const rows: Array<{ id: string; email: string | null }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('profiles')
      .select('id, email')
      .eq('is_demo', true)
      .order('email')
      .range(from, from + 999);
    must(error, 'membaca profil demo');
    rows.push(...((data ?? []) as Array<{ id: string; email: string | null }>));
    if ((data ?? []).length < 1000) break;
  }

  const synthetic = new Map<number, string>();
  const named = new Map<DemoAccount['key'], string>();
  for (const row of rows) {
    if (!row.email) continue;
    const match = SYNTHETIC_EMAIL.exec(row.email);
    if (match) {
      synthetic.set(Number(match[1]), row.id);
      continue;
    }
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === row.email);
    if (account) named.set(account.key, row.id);
  }
  return { synthetic, named };
}

// ─── Riwayat sintetis ──────────────────────────────────────────────────────────

export interface SyntheticHistory {
  mood: MoodRow[];
  sleep: SleepRow[];
  assessments: AssessmentRow[];
}

/**
 * Catatan 8 minggu untuk SEMUA pengguna sintetis, relatif terhadap `now`. Urutan pemanggilan acak sama dengan
 * pengisian awal, jadi tiap pengguna selalu mendapat watak (distress) yang sama.
 */
export function buildSyntheticHistory(
  users: readonly SyntheticUser[],
  idByIndex: ReadonlyMap<number, string>,
  now: Date,
): SyntheticHistory {
  const rng = createRng(SEED_VALUE);
  const history: SyntheticHistory = { mood: [], sleep: [], assessments: [] };
  for (const user of users) {
    const id = idByIndex.get(user.index);
    // Pembangkitan tetap berjalan untuk pengguna yang belum punya akun agar angka acak tidak bergeser.
    const userId = id ?? '00000000-0000-0000-0000-000000000000';
    const mood = generateMood(rng, userId, user.distress, now);
    const sleep = generateSleep(rng, userId, user.distress, now);
    const assessments = generateAssessments(rng, userId, user.distress, now, {
      ideation: user.ideation,
    });
    if (!id) continue;
    history.mood.push(...mood);
    history.sleep.push(...sleep);
    history.assessments.push(...assessments);
  }
  return history;
}

// ─── Peringatan krisis ─────────────────────────────────────────────────────────

export interface AlertInput {
  id: string;
  userId: string;
  sourceId: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface AlertPatch {
  id: string;
  patch: {
    created_at?: string;
    status?: 'resolved';
    acknowledged_by?: string | null;
    acknowledged_at?: string;
  };
}

/** Selisih jam (1 sampai 6) antara peringatan dan penanganannya, deterministik dari id. */
function handlingDelayHours(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return 1 + (hash % 6);
}

/**
 * Rencana perbaikan peringatan krisis demo (fungsi murni):
 *   1. `created_at` = waktu skrining sumbernya (trigger database mengisinya dengan waktu penyisipan, sehingga semua
 *      peringatan tampak bertanggal hari seed);
 *   2. peringatan klien psikolog demo: paling banyak `maxOpen` terbaru yang tetap terbuka, sisanya ditandai selesai
 *      ditangani oleh psikolog (`responderId`), beberapa jam setelah dibuat;
 *   3. peringatan pengguna lain: terbuka hanya bila terbaru (<= `openWindowDays`), selebihnya selesai.
 * Tidak pernah membuka kembali peringatan yang sudah ditangani. Alert tanpa sumber yang dikenal (mis. dibuat orang saat
 * mencoba aplikasi) tidak diubah tanggalnya.
 */
export function planAlertPatches(input: {
  alerts: readonly AlertInput[];
  completedAt: ReadonlyMap<string, string>;
  clientIds: ReadonlySet<string>;
  responderId: string | null;
  now: Date;
  maxOpen?: number;
  openWindowDays?: number;
}): AlertPatch[] {
  const maxOpen = input.maxOpen ?? MAX_OPEN_CLIENT_ALERTS;
  const openWindowMs = (input.openWindowDays ?? SYNTHETIC_OPEN_WINDOW_DAYS) * 86_400_000;
  const effective = (alert: AlertInput) =>
    (alert.sourceId ? input.completedAt.get(alert.sourceId) : undefined) ?? alert.createdAt;

  const patches = new Map<string, AlertPatch['patch']>();
  const patchOf = (id: string) => {
    const existing = patches.get(id);
    if (existing) return existing;
    const created: AlertPatch['patch'] = {};
    patches.set(id, created);
    return created;
  };
  const resolve = (alert: AlertInput, isClient: boolean) => {
    const createdAt = effective(alert);
    const handledAt = Math.min(
      Date.parse(createdAt) + handlingDelayHours(alert.id) * 3_600_000,
      input.now.getTime(),
    );
    const patch = patchOf(alert.id);
    patch.status = 'resolved';
    patch.acknowledged_by = isClient ? input.responderId : null;
    patch.acknowledged_at = new Date(handledAt).toISOString();
  };

  for (const alert of input.alerts) {
    const createdAt = effective(alert);
    if (createdAt !== alert.createdAt) patchOf(alert.id).created_at = createdAt;
  }

  // Klien psikolog demo: yang terbuka dibatasi, yang terbaru dipertahankan.
  const clientOpen = input.alerts
    .filter((alert) => input.clientIds.has(alert.userId) && alert.status === 'open')
    .sort(
      (a, b) => Date.parse(effective(b)) - Date.parse(effective(a)) || a.id.localeCompare(b.id),
    );
  for (const alert of clientOpen.slice(maxOpen)) resolve(alert, true);

  // Pengguna lain: hanya yang baru yang terbuka.
  for (const alert of input.alerts) {
    if (input.clientIds.has(alert.userId) || alert.status !== 'open') continue;
    if (input.now.getTime() - Date.parse(effective(alert)) > openWindowMs) resolve(alert, false);
  }

  return [...patches].map(([id, patch]) => ({ id, patch }));
}

// ─── Operasi basis data ────────────────────────────────────────────────────────

export interface RefreshOptions {
  now?: Date;
  /** Hanya membaca dan melaporkan rencana; tidak ada tulisan ke basis data. */
  dryRun?: boolean;
  log?: (message: string) => void;
}

export interface RefreshSummary {
  syntheticUsers: number;
  removed: { moodEntries: number; sleepEntries: number; assessments: number; crisisAlerts: number };
  inserted: { moodEntries: number; sleepEntries: number; assessments: number };
  demoUserFilled: { mood: number; sleep: number };
  alerts: { patched: number; openForClients: number; total: number };
  consultationAdded: boolean;
  psychologistProfiles: number;
  dryRun: boolean;
}

async function countRows(
  db: DataClient,
  table: string,
  userIds: readonly string[],
): Promise<number> {
  let total = 0;
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { count, error } = await db
      .from(table)
      .select('id', { count: 'exact', head: true })
      .in('user_id', ids);
    must(error, `menghitung ${table}`);
    total += count ?? 0;
  }
  return total;
}

async function deleteForUsers(
  db: DataClient,
  table: string,
  userIds: readonly string[],
): Promise<void> {
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { error } = await db.from(table).delete().in('user_id', ids);
    must(error, `menghapus ${table}`);
  }
}

export async function insertChunked(
  db: DataClient,
  table: string,
  rows: readonly object[],
): Promise<void> {
  for (const part of chunk(rows, INSERT_CHUNK)) {
    const { error } = await db.from(table).insert(part);
    must(error, `insert ke ${table}`);
  }
}

/** Menyisipkan skrining dan mengembalikan id serta waktunya (trigger membuat peringatan krisis pada penyisipan). */
export async function insertAssessments(
  db: DataClient,
  rows: readonly AssessmentRow[],
): Promise<Array<{ id: string; user_id: string; completed_at: string }>> {
  const inserted: Array<{ id: string; user_id: string; completed_at: string }> = [];
  for (const part of chunk(rows, INSERT_CHUNK)) {
    const { data, error } = await db
      .from('assessments')
      .insert(part)
      .select('id, user_id, completed_at');
    must(error, 'insert ke assessments');
    inserted.push(...((data ?? []) as typeof inserted));
  }
  return inserted;
}

async function loadAlerts(db: DataClient, userIds: readonly string[]): Promise<AlertInput[]> {
  const alerts: AlertInput[] = [];
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { data, error } = await db
      .from('crisis_alerts')
      .select('id, user_id, source_id, status, created_at')
      .in('user_id', ids);
    must(error, 'membaca crisis_alerts');
    for (const row of (data ?? []) as Array<{
      id: string;
      user_id: string;
      source_id: string | null;
      status: AlertInput['status'];
      created_at: string;
    }>) {
      alerts.push({
        id: row.id,
        userId: row.user_id,
        sourceId: row.source_id,
        status: row.status,
        createdAt: row.created_at,
      });
    }
  }
  return alerts;
}

/** Terapkan rencana peringatan: perbaiki tanggal dan status. Mengembalikan hitungan akhir. */
export async function finalizeAlerts(
  db: DataClient,
  input: {
    assessments: ReadonlyArray<{ id: string; completed_at: string }>;
    userIds: readonly string[];
    clientIds: ReadonlySet<string>;
    responderId: string | null;
    now: Date;
  },
): Promise<{ patched: number; openForClients: number; total: number }> {
  const alerts = await loadAlerts(db, input.userIds);
  const completedAt = new Map(input.assessments.map((row) => [row.id, row.completed_at]));
  const patches = planAlertPatches({
    alerts,
    completedAt,
    clientIds: input.clientIds,
    responderId: input.responderId,
    now: input.now,
  });
  await mapLimit(patches, CONCURRENCY, async ({ id, patch }) => {
    const { error } = await db.from('crisis_alerts').update(patch).eq('id', id);
    must(error, 'memperbarui crisis_alerts');
  });

  const resolvedNow = new Set(
    patches.filter((p) => p.patch.status === 'resolved').map((p) => p.id),
  );
  const openForClients = alerts.filter(
    (alert) =>
      input.clientIds.has(alert.userId) && alert.status === 'open' && !resolvedNow.has(alert.id),
  ).length;
  return { patched: patches.length, openForClients, total: alerts.length };
}

/** Id akun yang menjadi klien psikolog demo (sesuai tautan perawatan aktif). */
export async function loadClientIds(db: DataClient): Promise<Set<string>> {
  const { data, error } = await db
    .from('care_links')
    .select('patient_id')
    .eq('psychologist_id', PSYCHOLOGISTS[0]?.id as string)
    .eq('status', 'active');
  must(error, 'membaca care_links');
  return new Set(((data ?? []) as Array<{ patient_id: string }>).map((row) => row.patient_id));
}

/** Profil singkat dan penilaian contoh untuk psikolog demo. Hanya menimpa baris psikolog demo (UUID tetap). */
export async function applyPsychologistProfiles(db: DataClient): Promise<number> {
  for (const psychologist of PSYCHOLOGISTS) {
    const { error } = await db
      .from('psychologists')
      .update({
        bio: psychologist.bio,
        rating_average: psychologist.ratingAverage,
        total_reviews: psychologist.totalReviews,
      })
      .eq('id', psychologist.id);
    must(error, 'memperbarui psychologists');
  }
  return PSYCHOLOGISTS.length;
}

/** Jumat terdekat berikutnya pukul 15.00 WIB (08.00 UTC), selalu setelah `now`. */
export function nextFridayConsultation(now: Date): string {
  const friday = new Date(now);
  friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7 || 7));
  friday.setUTCHours(8, 0, 0, 0);
  return friday.toISOString();
}

async function fillDemoUser(
  db: DataClient,
  userId: string,
  now: Date,
  dryRun: boolean,
): Promise<{ mood: number; sleep: number }> {
  const since = new Date(now.getTime() - 9 * 86_400_000).toISOString();
  const { data: moods, error: moodError } = await db
    .from('mood_entries')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since);
  must(moodError, 'membaca mood_entries');
  const { data: sleeps, error: sleepError } = await db
    .from('sleep_entries')
    .select('wake_time')
    .eq('user_id', userId)
    .gte('wake_time', since);
  must(sleepError, 'membaca sleep_entries');

  const plan = planDemoUserFill(userId, now, {
    moodDays: new Set(
      ((moods ?? []) as Array<{ created_at: string }>).map((r) => wibDateKey(r.created_at)),
    ),
    sleepDays: new Set(
      ((sleeps ?? []) as Array<{ wake_time: string }>).map((r) => wibDateKey(r.wake_time)),
    ),
  });
  if (!dryRun) {
    await insertChunked(db, 'mood_entries', plan.mood);
    await insertChunked(db, 'sleep_entries', plan.sleep);
  }
  return { mood: plan.mood.length, sleep: plan.sleep.length };
}

async function ensureUpcomingConsultation(
  db: DataClient,
  userId: string,
  now: Date,
  dryRun: boolean,
): Promise<boolean> {
  const { count, error } = await db
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gt('scheduled_at', now.toISOString());
  must(error, 'membaca consultations');
  if ((count ?? 0) > 0) return false;
  if (!dryRun) {
    const { error: insertError } = await db.from('consultations').insert({
      user_id: userId,
      psychologist_id: PSYCHOLOGISTS[0]?.id,
      scheduled_at: nextFridayConsultation(now),
      status: 'confirmed',
    });
    must(insertError, 'insert ke consultations');
  }
  return true;
}

/**
 * Siapkan ulang riwayat pengguna sintetis dan peringatannya. Dipakai pengisian awal (tabel masih kosong, tidak ada
 * yang dihapus) dan penyegaran. Mengembalikan id skrining yang disisipkan.
 */
export async function loadSyntheticHistory(
  db: DataClient,
  people: DemoPeople,
  now: Date,
  options: { dryRun?: boolean } = {},
): Promise<{
  removed: RefreshSummary['removed'];
  inserted: RefreshSummary['inserted'];
  assessments: Array<{ id: string; completed_at: string }>;
}> {
  const users = generateUsers();
  const userIds = [...people.synthetic.values()];
  const removed = {
    moodEntries: await countRows(db, 'mood_entries', userIds),
    sleepEntries: await countRows(db, 'sleep_entries', userIds),
    assessments: await countRows(db, 'assessments', userIds),
    crisisAlerts: await countRows(db, 'crisis_alerts', userIds),
  };
  const history = buildSyntheticHistory(users, people.synthetic, now);
  const inserted = {
    moodEntries: history.mood.length,
    sleepEntries: history.sleep.length,
    assessments: history.assessments.length,
  };
  if (options.dryRun) return { removed, inserted, assessments: [] };

  // Peringatan dulu: ia merujuk skrining lewat `source_id` tanpa kunci asing, jadi tidak ikut terhapus bersama skrining.
  await deleteForUsers(db, 'crisis_alerts', userIds);
  await deleteForUsers(db, 'assessments', userIds);
  await deleteForUsers(db, 'mood_entries', userIds);
  await deleteForUsers(db, 'sleep_entries', userIds);

  await insertChunked(db, 'mood_entries', history.mood);
  await insertChunked(db, 'sleep_entries', history.sleep);
  const assessments = await insertAssessments(db, history.assessments);
  return { removed, inserted, assessments };
}

/** Penyegaran lengkap data demo tanpa menyentuh akun login (lihat catatan keamanan di kepala berkas). */
export async function refreshDemoData(
  db: DataClient,
  options: RefreshOptions = {},
): Promise<RefreshSummary> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const log = options.log ?? (() => undefined);

  const people = await loadDemoPeople(db);
  const demoUserId = people.named.get('user');
  if (people.synthetic.size === 0 || !demoUserId) {
    throw new RefreshError(
      'data demo belum ada. Jalankan `pnpm seed --yes` dulu (pengisian awal), baru `--refresh`.',
    );
  }
  log(
    `pengguna sintetis: ${people.synthetic.size}, akun demo bernama: ${people.named.size}. Akun login tidak disentuh.`,
  );

  const history = await loadSyntheticHistory(db, people, now, { dryRun });
  log(
    `${dryRun ? 'akan dihapus' : 'dihapus'} (hanya pengguna sintetis): mood ${history.removed.moodEntries}, tidur ${history.removed.sleepEntries}, skrining ${history.removed.assessments}, peringatan ${history.removed.crisisAlerts}; ` +
      `${dryRun ? 'akan disisipkan' : 'disisipkan'}: mood ${history.inserted.moodEntries}, tidur ${history.inserted.sleepEntries}, skrining ${history.inserted.assessments}`,
  );

  const demoUserFilled = await fillDemoUser(db, demoUserId, now, dryRun);
  log(
    `akun "pengguna": ${dryRun ? 'akan menambah' : 'menambah'} ${demoUserFilled.mood} catatan mood dan ${demoUserFilled.sleep} catatan tidur pada hari yang kosong (tidak ada yang dihapus)`,
  );
  const consultationAdded = await ensureUpcomingConsultation(db, demoUserId, now, dryRun);
  log(
    consultationAdded
      ? `konsultasi: ${dryRun ? 'akan menambah' : 'menambah'} satu sesi Jumat berikutnya`
      : 'konsultasi: sudah ada sesi mendatang, tidak ada yang ditambah',
  );

  const psychologistProfiles = dryRun ? PSYCHOLOGISTS.length : await applyPsychologistProfiles(db);
  log(`profil singkat dan penilaian contoh: ${psychologistProfiles} psikolog demo`);

  let alerts = { patched: 0, openForClients: 0, total: 0 };
  if (!dryRun) {
    const clientIds = await loadClientIds(db);
    alerts = await finalizeAlerts(db, {
      assessments: history.assessments,
      userIds: [...new Set([...people.synthetic.values(), ...clientIds])],
      clientIds,
      responderId: people.named.get('psychologist') ?? null,
      now,
    });
    log(
      `peringatan krisis: ${alerts.total} (diperbarui ${alerts.patched}); terbuka untuk klien psikolog: ${alerts.openForClients} (maksimal ${MAX_OPEN_CLIENT_ALERTS})`,
    );
  } else {
    log(
      'peringatan krisis: tidak dihitung pada --dry-run (butuh id skrining yang baru disisipkan)',
    );
  }

  return {
    syntheticUsers: people.synthetic.size,
    removed: history.removed,
    inserted: history.inserted,
    demoUserFilled,
    alerts,
    consultationAdded,
    psychologistProfiles,
    dryRun,
  };
}
