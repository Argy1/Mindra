import { describe, expect, it } from 'vitest';
import { portalRoleFor } from '@/lib/auth/route-access';
import { ONBOARDING_METADATA_KEY, ONBOARDING_STEPS, isOnboardingDone } from './steps';

describe('ONBOARDING_STEPS', () => {
  it('tiga langkah berurutan: kenali perasaan, pegang kendali data, tahu bantuan', () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual(['cek', 'privasi', 'bantuan']);
  });

  it('setiap langkah menuju halaman yang ada dan bisa dibuka pengguna biasa', () => {
    expect(ONBOARDING_STEPS.map((step) => step.href)).toEqual(['/asesmen', '/privasi', '/bantuan']);
    for (const step of ONBOARDING_STEPS) {
      const role = portalRoleFor(step.href);
      // Portal pengguna atau halaman publik; tidak pernah portal peran lain.
      expect(role === null || role === 'user', step.href).toBe(true);
    }
  });

  it('judul dan tautan unik; teks menyapa "kamu", tanpa tanda seru, emoji, atau meremehkan', () => {
    expect(new Set(ONBOARDING_STEPS.map((step) => step.title)).size).toBe(ONBOARDING_STEPS.length);
    expect(new Set(ONBOARDING_STEPS.map((step) => step.cta)).size).toBe(ONBOARDING_STEPS.length);
    for (const step of ONBOARDING_STEPS) {
      const text = `${step.title} ${step.description} ${step.cta}`;
      expect(text).not.toMatch(/!|\p{Extended_Pictographic}/u);
      expect(text).not.toMatch(/\bAnda\b/);
      expect(text.toLowerCase()).not.toMatch(/tenang aja|pasti bisa|jangan sedih/);
    }
    expect(ONBOARDING_STEPS.some((step) => /\bkamu\b/.test(step.description))).toBe(true);
  });

  it('skrining dijelaskan sebagai gambaran, bukan diagnosis', () => {
    expect(ONBOARDING_STEPS[0]?.description).toMatch(/bukan diagnosis/);
  });
});

describe('isOnboardingDone', () => {
  it('teks waktu tidak kosong = selesai', () => {
    expect(isOnboardingDone({ [ONBOARDING_METADATA_KEY]: '2026-10-14T10:00:00.000Z' })).toBe(true);
  });

  it.each([
    [undefined],
    [null],
    ['teks'],
    [42],
    [{}],
    [{ [ONBOARDING_METADATA_KEY]: '' }],
    [{ [ONBOARDING_METADATA_KEY]: '   ' }],
    [{ [ONBOARDING_METADATA_KEY]: true }],
    [{ [ONBOARDING_METADATA_KEY]: 1 }],
    [{ [ONBOARDING_METADATA_KEY]: null }],
    [{ nama_lain: '2026-10-14' }],
  ])('%j = belum selesai (tidak menebak)', (metadata) => {
    expect(isOnboardingDone(metadata)).toBe(false);
  });

  it('kunci metadata tetap onboarding_done_at (dipakai aksi dan sesi)', () => {
    expect(ONBOARDING_METADATA_KEY).toBe('onboarding_done_at');
  });
});
