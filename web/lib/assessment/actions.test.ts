// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTRUMENTS } from '@/lib/domain/assessment/instruments';
import { MAX_SUBMISSIONS_PER_HOUR } from '@/lib/assessment/prepare';

const revalidatePath = vi.fn();
const readPublicEnv = vi.fn();
const getSessionState = vi.fn();
const createClient = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => readPublicEnv() }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: () => getSessionState() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: () => createClient() }));

import { submitAssessmentAction } from './actions';

interface FakeOptions {
  count?: number;
  countError?: boolean;
  insertError?: boolean;
}

function fakeClient(options: FakeOptions = {}) {
  const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          gte: async () => ({
            count: options.count ?? 0,
            error: options.countError ? { message: 'boom' } : null,
          }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        inserted.push({ table, row });
        return {
          select: () => ({
            single: async () =>
              options.insertError
                ? { data: null, error: { message: 'boom' } }
                : { data: { id: 'hasil-baru' }, error: null },
          }),
        };
      },
    }),
  };
  return { client, inserted };
}

const full = (valueFor: (index: number) => number) =>
  Object.fromEntries(INSTRUMENTS.phq9.questions.map((q, i) => [q.id, valueFor(i)]));

const validInput = () => ({ type: 'phq9', answers: full(() => 1) });

beforeEach(() => {
  vi.clearAllMocks();
  readPublicEnv.mockReturnValue({ ok: true });
  getSessionState.mockResolvedValue({
    status: 'ok',
    profile: { id: 'user-sesi', email: 'a@t.test', name: 'A', role: 'user' },
  });
});

describe('submitAssessmentAction', () => {
  it('menyimpan hasil: user dari SESI, skor dan kategori dihitung server, jawaban mentah', async () => {
    const { client, inserted } = fakeClient();
    createClient.mockResolvedValue(client);

    const result = await submitAssessmentAction({ type: 'phq9', answers: full(() => 3) });

    expect(result).toEqual({ status: 'ok', id: 'hasil-baru' });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.table).toBe('assessments');
    expect(inserted[0]!.row).toMatchObject({
      user_id: 'user-sesi',
      type: 'phq9',
      total_score: 27,
      category: 'severe',
      sent_to_satusehat: false,
    });
    expect(inserted[0]!.row.answers).toHaveLength(9);
    expect(revalidatePath).toHaveBeenCalledWith('/beranda');
    expect(revalidatePath).toHaveBeenCalledWith('/asesmen');
  });

  it('PSS-10: jawaban mentah disimpan, skor klinis membalik butir terbalik', async () => {
    const { client, inserted } = fakeClient();
    createClient.mockResolvedValue(client);
    const answers = Object.fromEntries(INSTRUMENTS.pss10.questions.map((q) => [q.id, 4]));

    await submitAssessmentAction({ type: 'pss10', answers });

    expect(inserted[0]!.row).toMatchObject({ total_score: 24, category: 'moderate' });
    expect((inserted[0]!.row.answers as { score: number }[]).every((a) => a.score === 4)).toBe(
      true,
    );
  });

  it('SERANGAN: user_id, total_score, atau category di badan permintaan ditolak, bukan dipakai', async () => {
    const { client, inserted } = fakeClient();
    createClient.mockResolvedValue(client);

    for (const extra of [
      { user_id: 'korban' },
      { total_score: 0 },
      { category: 'minimal' },
      { completed_at: '2020-01-01T00:00:00Z' },
    ]) {
      const result = await submitAssessmentAction({ ...validInput(), ...extra });
      expect(result.status).toBe('error');
    }
    expect(inserted).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('permintaan rusak ditolak SEBELUM menyentuh sesi atau database', async () => {
    for (const input of [
      null,
      undefined,
      'x',
      3,
      {},
      { type: 'phq9' },
      { type: 'zzz', answers: {} },
    ]) {
      const result = await submitAssessmentAction(input);
      expect(result.status).toBe('error');
    }
    expect(getSessionState).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('jawaban belum lengkap atau di luar rentang ditolak dengan pesan ramah', async () => {
    const incomplete = full(() => 1);
    delete incomplete.phq9_4;
    const missing = await submitAssessmentAction({ type: 'phq9', answers: incomplete });
    expect(missing).toEqual({
      status: 'error',
      message: 'Masih ada pertanyaan yang belum dijawab. Kembali dan lengkapi dulu.',
    });
    const outOfRange = await submitAssessmentAction({
      type: 'phq9',
      answers: { ...full(() => 1), phq9_2: 9 },
    });
    expect(outOfRange.status).toBe('error');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('belum masuk atau sesi berakhir → pesan, tanpa menyimpan', async () => {
    const { client, inserted } = fakeClient();
    createClient.mockResolvedValue(client);
    for (const state of [{ status: 'signed-out' }, { status: 'no-profile' }]) {
      getSessionState.mockResolvedValueOnce(state);
      const result = await submitAssessmentAction(validInput());
      expect(result).toEqual({
        status: 'error',
        message: 'Sesimu sudah berakhir. Masuk lagi untuk menyimpan hasilnya.',
      });
    }
    expect(inserted).toEqual([]);
  });

  it('env Supabase belum diisi → pesan belum dikonfigurasi', async () => {
    readPublicEnv.mockReturnValue({ ok: false, problems: [] });
    const result = await submitAssessmentAction(validInput());
    expect(result.status).toBe('error');
    expect(getSessionState).not.toHaveBeenCalled();
  });

  it(`dibatasi ${MAX_SUBMISSIONS_PER_HOUR} kiriman per jam per akun`, async () => {
    const { client, inserted } = fakeClient({ count: MAX_SUBMISSIONS_PER_HOUR });
    createClient.mockResolvedValue(client);
    const result = await submitAssessmentAction(validInput());
    expect(result.status).toBe('error');
    expect(inserted).toEqual([]);

    const { client: ok, inserted: insertedOk } = fakeClient({
      count: MAX_SUBMISSIONS_PER_HOUR - 1,
    });
    createClient.mockResolvedValue(ok);
    expect((await submitAssessmentAction(validInput())).status).toBe('ok');
    expect(insertedOk).toHaveLength(1);
  });

  it('galat database atau jaringan → pesan umum yang ramah, bukan detail galat', async () => {
    createClient.mockResolvedValue(fakeClient({ insertError: true }).client);
    const dbFailure = await submitAssessmentAction(validInput());
    expect(dbFailure.status).toBe('error');
    if (dbFailure.status === 'error') expect(dbFailure.message).not.toMatch(/boom/);

    createClient.mockResolvedValue(fakeClient({ countError: true }).client);
    expect((await submitAssessmentAction(validInput())).status).toBe('error');

    createClient.mockRejectedValue(new Error('ECONNRESET'));
    const network = await submitAssessmentAction(validInput());
    expect(network).toMatchObject({ status: 'error' });
    if (network.status === 'error') expect(network.message).toMatch(/Koneksi terputus/);
  });

  it('tidak mencatat data jawaban/skor ke log', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    createClient.mockResolvedValue(fakeClient().client);
    await submitAssessmentAction(validInput());
    createClient.mockResolvedValue(fakeClient({ insertError: true }).client);
    await submitAssessmentAction(validInput());
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    for (const spy of spies) spy.mockRestore();
  });
});
