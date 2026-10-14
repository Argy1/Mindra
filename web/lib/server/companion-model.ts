import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { CompanionModel } from '@/lib/server/companion';

/**
 * Adaptor model untuk Teman cerita (Anthropic Messages API, streaming). Kunci hanya dibaca dari lingkungan
 * server (`ANTHROPIC_API_KEY`, tanpa awalan NEXT_PUBLIC_) dan tidak pernah dikirim ke klien. Kunci yang
 * dibundel di aplikasi mobile Flutter (temuan F7) TIDAK dipakai di sini dan harus diputar pemiliknya.
 *
 * Yang dikirim ke Anthropic hanya perintah sistem dan isi percakapan; tanpa nama, email, atau id pengguna.
 */

/** Model bawaan bila `ANTHROPIC_MODEL` kosong. */
export const DEFAULT_COMPANION_MODEL = 'claude-sonnet-5-5';
/** Batas keluaran per balasan: cukup untuk 2 sampai 4 paragraf pendek. */
export const MAX_OUTPUT_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 30_000;

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(20),
  ANTHROPIC_MODEL: z.string().trim().min(3).max(100).optional(),
});

export interface CompanionConfig {
  apiKey: string;
  model: string;
}

/** null = belum dikonfigurasi (kunci kosong atau terlalu pendek untuk kunci sungguhan). */
export function readCompanionConfig(
  env: Record<string, string | undefined> = process.env,
): CompanionConfig | null {
  const parsed = envSchema.safeParse({
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL?.trim() || undefined,
  });
  if (!parsed.success) return null;
  return {
    apiKey: parsed.data.ANTHROPIC_API_KEY,
    model: parsed.data.ANTHROPIC_MODEL ?? DEFAULT_COMPANION_MODEL,
  };
}

/** Bagian klien SDK yang dipakai; tes memakai tiruan dengan bentuk yang sama. */
export interface MessagesClient {
  messages: {
    stream(
      body: {
        model: string;
        max_tokens: number;
        system: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      },
      options?: { signal?: AbortSignal },
    ): AsyncIterable<unknown>;
  };
}

function textDelta(event: unknown): string | null {
  if (typeof event !== 'object' || event === null) return null;
  const candidate = event as { type?: unknown; delta?: { type?: unknown; text?: unknown } };
  if (candidate.type !== 'content_block_delta') return null;
  if (candidate.delta?.type !== 'text_delta') return null;
  return typeof candidate.delta.text === 'string' ? candidate.delta.text : null;
}

export function createAnthropicModel(
  config: CompanionConfig,
  client?: MessagesClient,
): CompanionModel {
  const sdk =
    client ??
    (new Anthropic({
      apiKey: config.apiKey,
      maxRetries: 1,
      timeout: REQUEST_TIMEOUT_MS,
    }) as unknown as MessagesClient);

  return {
    async *stream({ system, messages, signal }) {
      const stream = sdk.messages.stream(
        { model: config.model, max_tokens: MAX_OUTPUT_TOKENS, system, messages },
        signal ? { signal } : undefined,
      );
      for await (const event of stream) {
        const text = textDelta(event);
        if (text) yield text;
      }
    },
  };
}

let cached: { key: string; model: CompanionModel } | null = null;

/** Model produksi dari lingkungan, atau null bila belum dikonfigurasi. Instans dipakai ulang. */
export function getCompanionModel(): CompanionModel | null {
  const config = readCompanionConfig();
  if (!config) return null;
  const key = `${config.apiKey}:${config.model}`;
  if (cached?.key !== key) cached = { key, model: createAnthropicModel(config) };
  return cached.model;
}

export const isCompanionConfigured = (): boolean => readCompanionConfig() !== null;
