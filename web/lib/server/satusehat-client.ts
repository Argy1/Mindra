import 'server-only';
import { z } from 'zod';
import type { FhirObservation } from '@/lib/domain/fhir/observation';

/**
 * Klien SATUSEHAT (platform rekam medis nasional, Kemenkes). Dua mode, dipilih `SATUSEHAT_MODE`:
 *
 *   mock     (bawaan) SIMULASI LOKAL. Tidak ada satu byte pun yang keluar dari server Mindra: Observation
 *            hanya diperiksa strukturnya lalu dijawab dengan id tiruan `mock-...`. Alur persetujuan,
 *            pemetaan, pencatatan, dan tampilan bisa didemokan tanpa kredensial.
 *   staging  SATUSEHAT staging sungguhan: token OAuth2 client credentials lalu POST /Observation.
 *
 * Penyimpangan dari docs/ARCHITECTURE.md §6 (yang menyarankan server HAPI FHIR publik untuk mode mock):
 * mengirim hasil skrining pengguna nyata ke server uji PUBLIK melanggar prinsip privasi proyek ini, walau
 * datanya pseudonim. Mode mock sengaja tidak memakai jaringan.
 *
 * Jawaban galat tidak pernah memuat isi permintaan atau isi respons SATUSEHAT (bisa memuat data pasien).
 */

export type SatusehatMode = 'mock' | 'staging';

export interface SatusehatConfig {
  mode: SatusehatMode;
  authUrl?: string;
  baseUrl?: string;
  organizationId?: string;
  clientId?: string;
  clientSecret?: string;
}

export type SatusehatConfigResult =
  { ok: true; config: SatusehatConfig } | { ok: false; reason: string };

/** Membaca konfigurasi dari lingkungan. Nilai mode yang salah ketik DITOLAK, bukan diam-diam jadi mock. */
export function readSatusehatConfig(env: NodeJS.ProcessEnv = process.env): SatusehatConfigResult {
  const mode = env.SATUSEHAT_MODE?.trim() || 'mock';
  if (mode === 'mock') return { ok: true, config: { mode: 'mock' } };
  if (mode !== 'staging') {
    return { ok: false, reason: 'SATUSEHAT_MODE harus "mock" atau "staging".' };
  }

  const authUrl = env.SATUSEHAT_AUTH_URL?.trim();
  const baseUrl = env.SATUSEHAT_BASE_URL?.trim();
  const organizationId = env.SATUSEHAT_ORG_ID?.trim();
  const clientId = env.SATUSEHAT_CLIENT_ID?.trim();
  const clientSecret = env.SATUSEHAT_CLIENT_SECRET?.trim();
  if (!authUrl || !baseUrl || !organizationId || !clientId || !clientSecret) {
    return {
      ok: false,
      reason:
        'Mode staging butuh SATUSEHAT_AUTH_URL, SATUSEHAT_BASE_URL, SATUSEHAT_ORG_ID, SATUSEHAT_CLIENT_ID, dan SATUSEHAT_CLIENT_SECRET.',
    };
  }
  // Kredensial dikirim ke alamat ini: wajib HTTPS.
  for (const url of [authUrl, baseUrl]) {
    try {
      if (new URL(url).protocol !== 'https:') {
        return { ok: false, reason: 'Alamat SATUSEHAT harus memakai https.' };
      }
    } catch {
      return { ok: false, reason: 'Alamat SATUSEHAT tidak valid.' };
    }
  }
  return {
    ok: true,
    config: { mode: 'staging', authUrl, baseUrl, organizationId, clientId, clientSecret },
  };
}

export type CreateObservationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      /** validation = ditolak karena isi (tidak diulang); transient = coba lagi nanti; auth = kredensial. */
      kind: 'validation' | 'transient' | 'auth';
      message: string;
      retryAfterSeconds?: number;
    };

export interface SatusehatClient {
  mode: SatusehatMode;
  organizationId: string | undefined;
  createObservation(observation: FhirObservation): Promise<CreateObservationResult>;
}

/** Pemeriksaan struktur minimum Observation sebelum dikirim (juga dipakai mode mock). */
const observationShape = z.object({
  resourceType: z.literal('Observation'),
  status: z.literal('final'),
  category: z.array(z.object({ coding: z.array(z.object({ code: z.string() })).min(1) })).min(1),
  code: z.object({ coding: z.array(z.object({ system: z.string(), code: z.string() })).min(1) }),
  subject: z.object({ reference: z.string().min(1) }),
  effectiveDateTime: z.string().min(1),
  valueInteger: z.number().int(),
});

const TIMEOUT_MS = 10_000;
const TOKEN_SKEW_MS = 60_000;

interface CachedToken {
  value: string;
  expiresAt: number;
}

export function createSatusehatClient(
  config: SatusehatConfig,
  options: { fetchImpl?: typeof fetch; now?: () => number; newId?: () => string } = {},
): SatusehatClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());

  if (config.mode === 'mock') {
    return {
      mode: 'mock',
      organizationId: undefined,
      async createObservation(observation) {
        const parsed = observationShape.safeParse(observation);
        if (!parsed.success) {
          return { ok: false, kind: 'validation', message: 'Struktur Observation tidak valid.' };
        }
        return { ok: true, id: `mock-${newId()}` };
      },
    };
  }

  let token: CachedToken | null = null;

  async function getToken(force: boolean): Promise<string | null> {
    if (!force && token && token.expiresAt - TOKEN_SKEW_MS > now()) return token.value;
    try {
      const response = await fetchImpl(
        `${config.authUrl}/accesstoken?grant_type=client_credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId ?? '',
            client_secret: config.clientSecret ?? '',
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;
      const json = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof json.access_token !== 'string') return null;
      const seconds = Number(json.expires_in);
      token = {
        value: json.access_token,
        expiresAt: now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000,
      };
      return token.value;
    } catch {
      return null;
    }
  }

  async function post(observation: FhirObservation, bearer: string): Promise<Response | null> {
    try {
      return await fetchImpl(`${config.baseUrl}/Observation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
        body: JSON.stringify(observation),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
  }

  return {
    mode: 'staging',
    organizationId: config.organizationId,
    async createObservation(observation) {
      let bearer = await getToken(false);
      if (!bearer) {
        return { ok: false, kind: 'auth', message: 'Gagal masuk ke SATUSEHAT. Coba lagi nanti.' };
      }

      let response = await post(observation, bearer);
      // Token bisa dicabut sebelum waktunya: satu kali coba ulang dengan token baru.
      if (response?.status === 401) {
        bearer = await getToken(true);
        response = bearer ? await post(observation, bearer) : null;
      }

      if (!response) {
        return {
          ok: false,
          kind: 'transient',
          message: 'SATUSEHAT tidak menjawab. Akan dicoba lagi.',
        };
      }
      if (response.status === 201 || response.status === 200) {
        try {
          const json = (await response.json()) as { id?: unknown };
          if (typeof json.id === 'string' && json.id.length > 0) return { ok: true, id: json.id };
        } catch {
          // jatuh ke galat di bawah
        }
        return { ok: false, kind: 'transient', message: 'Jawaban SATUSEHAT tidak dikenali.' };
      }
      if (response.status === 429) {
        const retry = Number(response.headers.get('retry-after'));
        return {
          ok: false,
          kind: 'transient',
          message: 'SATUSEHAT sedang membatasi permintaan. Akan dicoba lagi.',
          ...(Number.isFinite(retry) && retry > 0 ? { retryAfterSeconds: retry } : {}),
        };
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, kind: 'auth', message: 'Kredensial SATUSEHAT ditolak.' };
      }
      if (response.status >= 400 && response.status < 500) {
        return { ok: false, kind: 'validation', message: 'Data ditolak SATUSEHAT.' };
      }
      return {
        ok: false,
        kind: 'transient',
        message: 'SATUSEHAT sedang bermasalah. Akan dicoba lagi.',
      };
    },
  };
}
