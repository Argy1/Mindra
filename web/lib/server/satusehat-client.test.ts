// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { observationFromAssessment, type FhirObservation } from '@/lib/domain/fhir/observation';
import {
  createSatusehatClient,
  readSatusehatConfig,
  type SatusehatConfig,
} from './satusehat-client';

const observation = (): FhirObservation =>
  observationFromAssessment(
    {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'phq9',
      score: 12,
      category: 'moderate',
      completedAt: '2026-10-13T01:00:00Z',
    },
    { patientRef: 'Patient/abc', issuedAt: '2026-10-13T02:00:00Z', mode: 'create' },
  );

const STAGING_ENV = {
  SATUSEHAT_MODE: 'staging',
  SATUSEHAT_AUTH_URL: 'https://auth.example.go.id/oauth2/v1',
  SATUSEHAT_BASE_URL: 'https://api.example.go.id/fhir-r4/v1',
  SATUSEHAT_ORG_ID: 'org-123',
  SATUSEHAT_CLIENT_ID: 'client-abc',
  SATUSEHAT_CLIENT_SECRET: 'rahasia-sekali',
} as unknown as NodeJS.ProcessEnv;

describe('readSatusehatConfig', () => {
  it('tanpa SATUSEHAT_MODE → mock (aman: tidak ada yang keluar)', () => {
    expect(readSatusehatConfig({} as NodeJS.ProcessEnv)).toEqual({
      ok: true,
      config: { mode: 'mock' },
    });
    expect(
      readSatusehatConfig({ SATUSEHAT_MODE: ' mock ' } as unknown as NodeJS.ProcessEnv).ok,
    ).toBe(true);
  });

  it('mode salah ketik DITOLAK walau semua variabel staging lengkap (tidak diam-diam jadi staging atau mock)', () => {
    for (const mode of ['Staging', 'prod', 'production', 'mock-test', 'STAGING ']) {
      const env = { ...STAGING_ENV, SATUSEHAT_MODE: mode } as unknown as NodeJS.ProcessEnv;
      const result = readSatusehatConfig(env);
      // `' staging '` dengan spasi dirapikan, selain itu harus ditolak; "STAGING" huruf besar ditolak.
      expect(result.ok, mode).toBe(false);
    }
    expect(
      readSatusehatConfig({
        ...STAGING_ENV,
        SATUSEHAT_MODE: ' staging ',
      } as unknown as NodeJS.ProcessEnv).ok,
    ).toBe(true);
  });

  it('staging butuh kelima variabel; satu kosong pun gagal', () => {
    expect(readSatusehatConfig(STAGING_ENV)).toMatchObject({
      ok: true,
      config: { mode: 'staging', organizationId: 'org-123' },
    });
    for (const name of [
      'SATUSEHAT_AUTH_URL',
      'SATUSEHAT_BASE_URL',
      'SATUSEHAT_ORG_ID',
      'SATUSEHAT_CLIENT_ID',
      'SATUSEHAT_CLIENT_SECRET',
    ]) {
      const env = { ...STAGING_ENV, [name]: '  ' } as unknown as NodeJS.ProcessEnv;
      expect(readSatusehatConfig(env).ok, name).toBe(false);
    }
  });

  it('alamat tanpa https ditolak (kredensial tidak boleh lewat jaringan terbuka)', () => {
    for (const bad of ['http://auth.example.go.id', 'ftp://x', 'bukan-url']) {
      const env = { ...STAGING_ENV, SATUSEHAT_AUTH_URL: bad } as unknown as NodeJS.ProcessEnv;
      expect(readSatusehatConfig(env).ok, bad).toBe(false);
    }
  });

  it('alasan galat tidak memuat nilai kredensial', () => {
    const result = readSatusehatConfig({
      ...STAGING_ENV,
      SATUSEHAT_BASE_URL: '',
    } as unknown as NodeJS.ProcessEnv);
    expect(JSON.stringify(result)).not.toContain('rahasia-sekali');
  });
});

describe('mode mock', () => {
  it('menjawab id tiruan TANPA memakai jaringan sama sekali', async () => {
    const fetchImpl = vi.fn();
    const client = createSatusehatClient({ mode: 'mock' }, { fetchImpl, newId: () => 'abc' });
    expect(await client.createObservation(observation())).toEqual({ ok: true, id: 'mock-abc' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.mode).toBe('mock');
  });

  it('struktur yang rusak ditolak sebagai validasi', async () => {
    const client = createSatusehatClient({ mode: 'mock' });
    for (const broken of [
      {},
      { ...observation(), status: 'draft' },
      { ...observation(), valueInteger: 1.5 },
      { ...observation(), subject: {} },
    ]) {
      const result = await client.createObservation(broken as never);
      expect(result).toMatchObject({ ok: false, kind: 'validation' });
    }
  });
});

describe('mode staging', () => {
  const config: SatusehatConfig = {
    mode: 'staging',
    authUrl: 'https://auth.example.go.id/oauth2/v1',
    baseUrl: 'https://api.example.go.id/fhir-r4/v1',
    organizationId: 'org-123',
    clientId: 'client-abc',
    clientSecret: 'rahasia-sekali',
  };
  const tokenResponse = () =>
    new Response(JSON.stringify({ access_token: 'tok-1', expires_in: 3600 }), { status: 200 });
  const created = () =>
    new Response(JSON.stringify({ resourceType: 'Observation', id: 'sat-1' }), { status: 201 });

  function setup(
    handler: (url: string, init: RequestInit, call: number) => Response | Promise<Response> | null,
  ) {
    let call = 0;
    const clock = { now: 1_000_000 };
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      call += 1;
      const result = await handler(String(url), init ?? {}, call);
      if (result === null) throw new Error('jaringan putus');
      return result;
    });
    const client = createSatusehatClient(config, {
      fetchImpl: fetchImpl as never,
      now: () => clock.now,
    });
    return { client, fetchImpl, clock };
  }

  it('token OAuth2 client credentials (form), lalu POST /Observation dengan Bearer dan FHIR JSON', async () => {
    const { client, fetchImpl } = setup((url) =>
      url.includes('accesstoken') ? tokenResponse() : created(),
    );
    expect(await client.createObservation(observation())).toEqual({ ok: true, id: 'sat-1' });

    const [tokenUrl, tokenInit] = fetchImpl.mock.calls[0]!;
    expect(String(tokenUrl)).toBe(
      'https://auth.example.go.id/oauth2/v1/accesstoken?grant_type=client_credentials',
    );
    expect(tokenInit?.method).toBe('POST');
    const form = new URLSearchParams(String(tokenInit?.body));
    expect(form.get('client_id')).toBe('client-abc');
    expect(form.get('client_secret')).toBe('rahasia-sekali');

    const [postUrl, postInit] = fetchImpl.mock.calls[1]!;
    expect(String(postUrl)).toBe('https://api.example.go.id/fhir-r4/v1/Observation');
    expect((postInit?.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect((postInit?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/fhir+json',
    );
    expect(JSON.parse(String(postInit?.body)).resourceType).toBe('Observation');
  });

  it('token dipakai ulang sampai hampir kedaluwarsa, lalu diminta lagi', async () => {
    const { client, fetchImpl, clock } = setup((url) =>
      url.includes('accesstoken') ? tokenResponse() : created(),
    );
    await client.createObservation(observation());
    await client.createObservation(observation());
    expect(
      fetchImpl.mock.calls.filter(([url]) => String(url).includes('accesstoken')),
    ).toHaveLength(1);

    clock.now += 3_600_000; // lewat masa berlaku
    await client.createObservation(observation());
    expect(
      fetchImpl.mock.calls.filter(([url]) => String(url).includes('accesstoken')),
    ).toHaveLength(2);
  });

  it('401 dari server: satu kali coba ulang dengan token baru', async () => {
    let posts = 0;
    const { client, fetchImpl } = setup((url) => {
      if (url.includes('accesstoken')) return tokenResponse();
      posts += 1;
      return posts === 1 ? new Response('{}', { status: 401 }) : created();
    });
    expect(await client.createObservation(observation())).toEqual({ ok: true, id: 'sat-1' });
    expect(
      fetchImpl.mock.calls.filter(([url]) => String(url).includes('accesstoken')),
    ).toHaveLength(2);
  });

  it.each([
    ['400', 400, 'validation'],
    ['422', 422, 'validation'],
    ['403', 403, 'auth'],
    ['429', 429, 'transient'],
    ['500', 500, 'transient'],
    ['503', 503, 'transient'],
  ])('status %s → %s', async (_name, status, kind) => {
    const { client } = setup((url) =>
      url.includes('accesstoken')
        ? tokenResponse()
        : new Response(
            JSON.stringify({ issue: [{ diagnostics: 'NIK 3201234567890123 tidak valid' }] }),
            { status: status as number, headers: status === 429 ? { 'retry-after': '30' } : {} },
          ),
    );
    const result = await client.createObservation(observation());
    expect(result).toMatchObject({ ok: false, kind });
    if (status === 429) expect(result).toMatchObject({ retryAfterSeconds: 30 });
    // Isi respons SATUSEHAT (bisa memuat data pasien) tidak pernah diteruskan.
    expect(JSON.stringify(result)).not.toMatch(/NIK|3201234567890123/);
  });

  it('gagal mendapat token → auth; jaringan putus → transient; respons 201 tanpa id → transient', async () => {
    const noToken = setup((url) =>
      url.includes('accesstoken') ? new Response('{}', { status: 401 }) : created(),
    );
    expect(await noToken.client.createObservation(observation())).toMatchObject({
      ok: false,
      kind: 'auth',
    });

    const down = setup((url) => (url.includes('accesstoken') ? tokenResponse() : null));
    expect(await down.client.createObservation(observation())).toMatchObject({
      ok: false,
      kind: 'transient',
    });

    const noId = setup((url) =>
      url.includes('accesstoken') ? tokenResponse() : new Response('{}', { status: 201 }),
    );
    expect(await noId.client.createObservation(observation())).toMatchObject({
      ok: false,
      kind: 'transient',
    });
  });

  it('kunci rahasia tidak pernah muncul di hasil galat', async () => {
    const { client } = setup(() => new Response('{}', { status: 401 }));
    expect(JSON.stringify(await client.createObservation(observation()))).not.toContain(
      'rahasia-sekali',
    );
  });
});
