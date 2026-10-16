import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaSecurityView } from './MfaSecurityView';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

const listFactors = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { mfa: { listFactors } } }),
}));
const getAalInfo = vi.fn();
vi.mock('@/lib/auth/mfa-server', () => ({ getAalInfo: () => getAalInfo() }));
vi.mock('@/components/features/psychologist/TotpEnrollment', () => ({
  TotpEnrollment: ({ mode }: { mode: string }) => <div data-testid={`enroll-${mode}`} />,
}));
vi.mock('@/components/features/psychologist/TotpChallenge', () => ({ TotpChallenge: () => null }));

const FACTOR = {
  id: 'f1',
  friendly_name: 'Perangkat 16 Okt 2026, 00.24 WIB',
  created_at: '2026-10-15T17:24:00Z',
};
const props = { required: false, intro: 'intro', requiredNotice: 'wajib' } as const;

async function renderView(overrides: Partial<Parameters<typeof MfaSecurityView>[0]> = {}) {
  render(await MfaSecurityView({ role: 'psychologist', ...props, ...overrides }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getAalInfo.mockResolvedValue({ currentLevel: 'aal2', nextLevel: 'aal2' });
  listFactors.mockResolvedValue({ data: { totp: [FACTOR] } });
});

describe('MfaSecurityView: pesan sukses setelah TOTP terpasang', () => {
  it('?berhasil=1 dengan TOTP aktif dan sesi aal2: pesan sukses dan tombol "Lanjut ke dasbor" ke beranda portal', async () => {
    await renderView({ justEnrolled: true });
    expect(screen.getByRole('status')).toHaveTextContent('Verifikasi dua langkah aktif');
    expect(screen.getByRole('link', { name: 'Lanjut ke dasbor' })).toHaveAttribute(
      'href',
      '/psikolog',
    );
  });

  it.each([
    ['facility_admin', '/faskes'],
    ['admin', '/admin'],
  ] as const)('tombol lanjut untuk %s menuju %s', async (role, home) => {
    await renderView({ role, justEnrolled: true });
    expect(screen.getByRole('link', { name: 'Lanjut ke dasbor' })).toHaveAttribute('href', home);
  });

  it('tanpa ?berhasil=1: tidak ada pesan sukses atau tombol lanjut', async () => {
    await renderView({ justEnrolled: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Lanjut ke dasbor' })).not.toBeInTheDocument();
  });

  it('?berhasil=1 tetapi TOTP belum ada: parameter diabaikan (tidak ada pesan sukses palsu)', async () => {
    listFactors.mockResolvedValue({ data: { totp: [] } });
    await renderView({ justEnrolled: true });
    expect(screen.queryByRole('link', { name: 'Lanjut ke dasbor' })).not.toBeInTheDocument();
    expect(screen.getByTestId('enroll-first')).toBeInTheDocument();
  });

  it('?berhasil=1 pada sesi yang BELUM aal2: dialihkan ke verifikasi, tidak ada pesan sukses', async () => {
    getAalInfo.mockResolvedValue({ currentLevel: 'aal1', nextLevel: 'aal2' });
    await expect(renderView({ justEnrolled: true })).rejects.toThrow(
      'REDIRECT:/psikolog/verifikasi',
    );
  });

  it('nama perangkat dari Supabase tampil apa adanya (berformat WIB)', async () => {
    await renderView({ justEnrolled: true });
    expect(screen.getByText('Perangkat 16 Okt 2026, 00.24 WIB')).toBeInTheDocument();
  });
});
