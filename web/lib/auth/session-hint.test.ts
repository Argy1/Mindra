import { describe, expect, it } from 'vitest';
import { hasAuthCookie } from './session-hint';

describe('hasAuthCookie', () => {
  it('mengenali cookie sesi Supabase, utuh maupun terpecah', () => {
    expect(hasAuthCookie('sb-abcdef-auth-token=base64-eyJ')).toBe(true);
    expect(
      hasAuthCookie('tema=gelap; sb-abcdef-auth-token.0=eyJ; sb-abcdef-auth-token.1=xyz'),
    ).toBe(true);
  });

  it('tanpa cookie sesi, kosong, atau bernilai kosong: belum masuk', () => {
    expect(hasAuthCookie('')).toBe(false);
    expect(hasAuthCookie('tema=gelap; lang=id')).toBe(false);
    expect(hasAuthCookie('sb-abcdef-auth-token=')).toBe(false);
  });

  it('cookie lain yang kebetulan mirip namanya tidak dihitung', () => {
    expect(hasAuthCookie('x-sb-abcdef-auth-token=1')).toBe(false);
    expect(hasAuthCookie('sb-abcdef-auth-token-code-verifier=1')).toBe(false);
    expect(hasAuthCookie('sb--auth-token=1')).toBe(false);
  });
});
