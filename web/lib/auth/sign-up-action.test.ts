// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  signUp: vi.fn(),
  redirected: null as string | null,
}));

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    state.redirected = to;
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock('@/lib/env/public', () => ({
  readPublicEnv: () => ({ ok: true }),
  getPublicEnv: () => ({ NEXT_PUBLIC_SITE_URL: 'https://mindra.test' }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signUp: state.signUp } }),
}));

import { signUpAction } from './actions';
import { initialFormState } from './form-state';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const base = {
  name: 'Rina Sari',
  email: 'rina@email.com',
  password: 'kata-sandi-aman',
  ageConfirmed: 'on',
  consent: 'on',
};

const metadataSent = () => state.signUp.mock.calls[0]![0].options.data as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  state.signUp.mockResolvedValue({ data: { session: null }, error: null });
});

describe('signUpAction: nomor STR calon psikolog', () => {
  it('psikolog + STR: metadata membawa requested_role dan requested_str (sudah dipangkas dan dirapikan)', async () => {
    const result = await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'psychologist', strNumber: '  STR   1234 5678 ' }),
    );
    expect(result.status).toBe('success');
    expect(metadataSent()).toMatchObject({
      full_name: 'Rina Sari',
      requested_role: 'psychologist',
      requested_str: 'STR 1234 5678',
    });
  });

  it('psikolog tanpa STR: ditolak sebelum menghubungi Supabase, dengan pesan di kolom STR dan isian dikembalikan', async () => {
    const result = await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'psychologist', strNumber: '   ' }),
    );
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.strNumber).toMatch(/Isi nomor STR-mu/);
    expect(result.values).toMatchObject({ accountType: 'psychologist', strNumber: '   ' });
    expect(state.signUp).not.toHaveBeenCalled();
  });

  it('STR tidak sah dikembalikan apa adanya agar bisa diperbaiki, dan tidak dikirim', async () => {
    const result = await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'psychologist', strNumber: '<b>12345' }),
    );
    expect(result.fieldErrors?.strNumber).toMatch(/hanya boleh berisi/);
    expect(result.values?.strNumber).toBe('<b>12345');
    expect(state.signUp).not.toHaveBeenCalled();
  });

  it('pendaftar biasa: STR yang diselipkan tidak ikut ke metadata, dan tidak ada permintaan peran', async () => {
    await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'self', strNumber: 'STR-DISELIPKAN' }),
    );
    const data = metadataSent();
    expect(data).not.toHaveProperty('requested_role');
    expect(data).not.toHaveProperty('requested_str');
    expect(JSON.stringify(data)).not.toContain('DISELIPKAN');
  });

  it('galat dari server mengembalikan STR ke formulir hanya untuk psikolog', async () => {
    state.signUp.mockResolvedValue({ data: { session: null }, error: { status: 500, code: 'x' } });
    const psychologist = await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'psychologist', strNumber: 'STR-12345' }),
    );
    expect(psychologist.status).toBe('error');
    expect(psychologist.values?.strNumber).toBe('STR-12345');

    const plain = await signUpAction(
      initialFormState,
      form({ ...base, accountType: 'self', strNumber: 'STR-12345' }),
    );
    expect(plain.values?.strNumber).toBe('');
  });
});
