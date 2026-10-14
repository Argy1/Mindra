/**
 * Data demo Mindra Web (docs/ARCHITECTURE.md §4.3).
 *
 *   pnpm seed            isi data demo (akun, ±300 pengguna sintetis, 20 faskes, 10 psikolog)
 *   pnpm seed --reset    hapus HANYA data demo (profiles.is_demo = true + faskes/psikolog ber-ID tetap)
 *   pnpm seed --add-accounts  tambah akun demo yang BELUM ada (mis. akun baru Gelombang 1) tanpa menyentuh data demo lain
 *
 * Opsi: --yes  wajib bila target BUKAN Supabase lokal (mencegah salah sasaran).
 *
 * Aman: tidak pernah menyentuh baris non-demo; tidak pernah mencetak kunci atau kata sandi.
 * Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (dimuat dari .env.local lewat
 * `tsx --env-file`). Migrasi 20261014000000_web_ecosystem.sql HARUS sudah diterapkan.
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  CITIES,
  DEFAULT_DEMO_PASSWORD,
  DEMO_ACCOUNTS,
  DEMO_FACILITY_IDS,
  DEMO_PSYCHOLOGIST_IDS,
  FACILITIES,
  PSYCHOLOGISTS,
  type DemoAccount,
} from './seed/catalog';
import { generateUsers, type SyntheticUser } from './seed/people';
import {
  generateAssessments,
  generateDemoUserRecords,
  generateMood,
  generateSleep,
  type AssessmentRow,
  type MoodRow,
  type SleepRow,
} from './seed/records';
import { createRng } from './seed/rng';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/;
const CONCURRENCY = 8;
const CHUNK = 500;

const log = (message: string) => console.log(`[seed] ${message}`);
const fail = (message: string): never => {
  console.error(`[seed] GAGAL: ${message}`);
  process.exit(1);
};

// Klien tanpa generik skema: skrip ini menulis ke banyak tabel dan tidak ikut tipe ketat aplikasi.
type Db = SupabaseClient;

async function mapLimit<T, R>(
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

async function insertChunked(db: Db, table: string, rows: readonly object[]): Promise<void> {
  for (let start = 0; start < rows.length; start += CHUNK) {
    const { error } = await db.from(table).insert(rows.slice(start, start + CHUNK));
    if (error) fail(`insert ke ${table}: ${error.code ?? ''} ${error.message}`);
  }
}

async function createAuthUser(
  db: Db,
  input: {
    email: string;
    password: string;
    name: string;
    role?: string;
    city: string;
    province: string;
    extra?: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name },
  });
  if (error || !data.user)
    fail(`membuat pengguna ${input.email}: ${error?.message ?? 'tanpa data'}`);
  const id = (data!.user as { id: string }).id;

  // Peran dan penanda demo hanya bisa diubah service role (trigger penjaga di database).
  const { error: profileError } = await db
    .from('profiles')
    .update({
      is_demo: true,
      role: input.role ?? 'user',
      city: input.city,
      domicile_province: input.province,
      // Akun demo sintetis dianggap setuju ikut statistik wilayah anonim (opt-in; migrasi 000600).
      share_region_stats: true,
      ...input.extra,
    })
    .eq('id', id);
  if (profileError) fail(`memperbarui profil ${input.email}: ${profileError.message}`);
  return id;
}

// ─── Hapus data demo ───────────────────────────────────────────────────────────
async function reset(db: Db): Promise<void> {
  const { data: demo, error } = await db.from('profiles').select('id').eq('is_demo', true);
  if (error) fail(`membaca profil demo: ${error.message}`);
  const ids = (demo ?? []).map((row: { id: string }) => row.id);

  // consultations.psychologist_id tidak ber-cascade: hapus dulu sebelum psikolog demo.
  await db.from('consultations').delete().in('psychologist_id', DEMO_PSYCHOLOGIST_IDS);
  await db.from('psychologists').delete().in('id', DEMO_PSYCHOLOGIST_IDS);
  await db.from('facilities').delete().in('id', DEMO_FACILITY_IDS);

  let removed = 0;
  await mapLimit(ids, CONCURRENCY, async (id) => {
    const { error: deleteError } = await db.auth.admin.deleteUser(id);
    if (deleteError) fail(`menghapus pengguna demo ${id}: ${deleteError.message}`);
    removed += 1;
  });
  log(
    `dihapus: ${removed} akun demo beserta seluruh datanya, ${FACILITIES.length} faskes, ${PSYCHOLOGISTS.length} psikolog. Data non-demo tidak disentuh.`,
  );
}

// ─── Tambah akun demo yang belum ada ───────────────────────────────────────────
/** Tidak menghapus atau mengubah apa pun yang sudah ada; akun dicocokkan lewat email. */
async function addMissingAccounts(db: Db, demoPassword: string): Promise<void> {
  const { data, error } = await db
    .from('profiles')
    .select('email')
    .in(
      'email',
      DEMO_ACCOUNTS.map((account) => account.email),
    );
  if (error) fail(`membaca akun demo: ${error.message}`);
  const existing = new Set((data ?? []).map((row: { email: string }) => row.email));

  const created: string[] = [];
  for (const account of DEMO_ACCOUNTS) {
    if (existing.has(account.email)) continue;
    await createAuthUser(db, {
      email: account.email,
      password: demoPassword,
      name: account.name,
      role: account.role,
      city: account.city,
      province: account.province,
      ...(account.requestedRole ? { extra: { requested_role: account.requestedRole } } : {}),
    });
    created.push(account.email);
  }
  log(
    created.length > 0
      ? `akun demo ditambahkan: ${created.join(', ')}`
      : 'semua akun demo sudah ada; tidak ada yang ditambahkan.',
  );
}

// ─── Isi data demo ─────────────────────────────────────────────────────────────
async function seed(db: Db, demoPassword: string): Promise<void> {
  const { count } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_demo', true);
  if ((count ?? 0) > 0)
    fail(
      'data demo sudah ada. Jalankan `pnpm seed --add-accounts` untuk menambah akun demo yang belum ada, atau `pnpm seed --reset` dulu bila ingin membuat ulang semuanya.',
    );

  const { count: realUsers } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_demo', false);
  log(`pengguna non-demo di database ini: ${realUsers ?? 0} (tidak akan disentuh).`);

  const now = new Date();
  const rng = createRng(20261013);

  // 1. Faskes dan psikolog (UUID tetap → mudah dihapus).
  await insertChunked(
    db,
    'facilities',
    FACILITIES.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      city: f.city,
      province: f.province,
      lat: f.lat,
      lng: f.lng,
      has_mental_health_service: true,
    })),
  );
  await insertChunked(
    db,
    'psychologists',
    PSYCHOLOGISTS.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      specializations: p.specializations,
      languages: ['id'],
      himpsi_verified: true,
      consultation_fee: p.fee,
      is_active: true,
    })),
  );
  await insertChunked(
    db,
    'psychologist_schedules',
    PSYCHOLOGISTS.flatMap((p) =>
      [1, 2, 3, 4, 5].map((day) => ({
        psychologist_id: p.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '16:00',
        max_slots_per_slot: 1,
      })),
    ),
  );
  log(`faskes: ${FACILITIES.length}, psikolog: ${PSYCHOLOGISTS.length}`);

  // 2. Akun demo yang bisa dipakai masuk.
  const accountIds = new Map<DemoAccount['key'], string>();
  for (const account of DEMO_ACCOUNTS) {
    const id = await createAuthUser(db, {
      email: account.email,
      password: demoPassword,
      name: account.name,
      role: account.role,
      city: account.city,
      province: account.province,
      ...(account.requestedRole ? { extra: { requested_role: account.requestedRole } } : {}),
    });
    accountIds.set(account.key, id);
  }
  log(`akun demo: ${DEMO_ACCOUNTS.map((a) => a.email).join(', ')}`);

  // 3. Pengguna sintetis (sandi acak yang tidak disimpan: tidak bisa dipakai masuk).
  const users = generateUsers();
  const userIds = new Map<number, string>();
  await mapLimit(users, CONCURRENCY, async (user: SyntheticUser) => {
    const id = await createAuthUser(db, {
      email: user.email,
      password: `${randomUUID()}Aa1!`,
      name: user.name,
      city: user.city,
      province: user.province,
      extra: { gender: user.gender, date_of_birth: user.dateOfBirth },
    });
    userIds.set(user.index, id);
  });
  log(`pengguna sintetis: ${users.length} di ${CITIES.length} kota`);

  // 4. Catatan 8 minggu.
  const mood: MoodRow[] = [];
  const sleep: SleepRow[] = [];
  const assessments: AssessmentRow[] = [];
  for (const user of users) {
    const id = userIds.get(user.index) as string;
    mood.push(...generateMood(rng, id, user.distress, now));
    sleep.push(...generateSleep(rng, id, user.distress, now));
    assessments.push(
      ...generateAssessments(rng, id, user.distress, now, { ideation: user.ideation }),
    );
  }
  const demoUserId = accountIds.get('user') as string;
  const demoRecords = generateDemoUserRecords(rng, demoUserId, now);
  mood.push(...demoRecords.mood);
  sleep.push(...demoRecords.sleep);
  assessments.push(...demoRecords.assessments);

  await insertChunked(db, 'mood_entries', mood);
  await insertChunked(db, 'sleep_entries', sleep);
  await insertChunked(db, 'assessments', assessments); // trigger database membuat crisis_alerts
  log(`mood: ${mood.length}, tidur: ${sleep.length}, asesmen: ${assessments.length}`);

  // Alert dibuat trigger pada saat INSERT; mundurkan ke waktu asesmennya supaya riwayat terlihat wajar.
  const { data: alerts } = await db
    .from('crisis_alerts')
    .select('id, source_id')
    .eq('source', 'assessment');
  const sourceIds = (alerts ?? []).map((a: { source_id: string }) => a.source_id);
  if (sourceIds.length > 0) {
    const { data: sources } = await db
      .from('assessments')
      .select('id, completed_at')
      .in('id', sourceIds);
    const completedAt = new Map(
      (sources ?? []).map((s: { id: string; completed_at: string }) => [s.id, s.completed_at]),
    );
    await mapLimit(alerts ?? [], CONCURRENCY, async (alert: { id: string; source_id: string }) => {
      await db
        .from('crisis_alerts')
        .update({ created_at: completedAt.get(alert.source_id) })
        .eq('id', alert.id);
    });
  }
  log(`alert krisis: ${alerts?.length ?? 0}`);

  // 5. Hubungan antar peran.
  const psychologistAccount = accountIds.get('psychologist') as string;
  await db
    .from('psychologists')
    .update({ profile_id: psychologistAccount })
    .eq('id', PSYCHOLOGISTS[0]?.id);

  const bogorClients = users.filter((u) => u.city === 'Kota Bogor').slice(0, 7);
  const ideationClients = users.filter((u) => u.ideation && u.city === 'Kota Bogor').slice(0, 2);
  const clientIds = [
    demoUserId,
    ...new Set([...bogorClients, ...ideationClients].map((u) => userIds.get(u.index) as string)),
  ];
  await insertChunked(
    db,
    'care_links',
    clientIds.map((patientId) => ({
      patient_id: patientId,
      psychologist_id: PSYCHOLOGISTS[0]?.id,
      permissions: {
        assessments: true,
        mood: true,
        sleep: true,
        crisis_alerts: true,
        ai_summary: false,
      },
    })),
  );

  await db.from('caregiver_relationships').insert({
    patient_id: demoUserId,
    caregiver_id: accountIds.get('caregiver'),
    invite_code: 'DEMO0001',
    status: 'active',
    permissions: {
      mood_daily: true,
      assessment_results: false,
      app_activity: false,
      emergency_alerts: true,
    },
  });
  await db
    .from('facility_admins')
    .insert({ profile_id: accountIds.get('facility'), facility_id: FACILITIES[0]?.id });

  // Konsultasi berikutnya: Jumat terdekat, 15.00 WIB (08.00 UTC).
  const friday = new Date(now);
  friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7 || 7));
  friday.setUTCHours(8, 0, 0, 0);
  await db.from('consultations').insert({
    user_id: demoUserId,
    psychologist_id: PSYCHOLOGISTS[0]?.id,
    scheduled_at: friday.toISOString(),
    status: 'confirmed',
  });
  log(
    `klien psikolog demo: ${clientIds.length}, pendamping demo: 1, admin faskes: 1, konsultasi: 1`,
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    fail(
      'isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local (lihat .env.example).',
    );

  const host = new URL(url as string).hostname;
  log(`target: ${host}`);
  if (!LOCAL_HOST.test(host) && !args.has('--yes')) {
    fail(
      `${host} bukan Supabase lokal. Ulangi dengan --yes bila memang ingin menulis ke proyek ini.`,
    );
  }

  const db = createClient(url as string, key as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (args.has('--reset')) await reset(db);
  else if (args.has('--add-accounts'))
    await addMissingAccounts(db, process.env.DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD);
  else await seed(db, process.env.DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD);
  log('selesai.');
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
