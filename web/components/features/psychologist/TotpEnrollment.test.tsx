import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpEnrollment } from './TotpEnrollment';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => '/psikolog/keamanan',
}));

const mfa = {
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
};
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { mfa } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mfa.listFactors.mockResolvedValue({
    data: { all: [{ id: 'lama', factor_type: 'totp', status: 'unverified' }] },
  });
  mfa.unenroll.mockResolvedValue({ data: {}, error: null });
  mfa.enroll.mockResolvedValue({
    data: {
      id: 'f1',
      totp: { qr_code: 'data:image/svg+xml;utf8,<svg/>', secret: 'ABCDEFGHIJKLMNOP' },
    },
    error: null,
  });
  mfa.challengeAndVerify.mockResolvedValue({ error: null });
});

async function openScan(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: label }));
  await screen.findByText('Kode verifikasi');
}

describe('TotpEnrollment: pasang pertama', () => {
  it('memberi nama perangkat berformat WIB dan membersihkan percobaan lama yang belum terverifikasi', async () => {
    const user = userEvent.setup();
    render(<TotpEnrollment mode="first" />);
    await openScan(user, 'Mulai pasang verifikasi');

    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'lama' });
    const { friendlyName, factorType, issuer } = mfa.enroll.mock.calls[0]![0] as Record<
      string,
      string
    >;
    expect(factorType).toBe('totp');
    expect(issuer).toBe('Mindra');
    // Sebelumnya "Perangkat 2026-10-15 17:24" (UTC); kini jam WIB, mis. "Perangkat 16 Okt 2026, 00.24 WIB".
    expect(friendlyName).toMatch(
      /^Perangkat \d{1,2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) \d{4}, \d{2}\.\d{2} WIB$/,
    );
    expect(screen.getByTestId('totp-secret')).toHaveTextContent('ABCD EFGH IJKL MNOP');
  });

  it('berhasil: memuat ulang halaman Keamanan dengan ?berhasil=1 (pesan sukses), BUKAN langsung ke dasbor', async () => {
    const user = userEvent.setup();
    render(<TotpEnrollment mode="first" />);
    await openScan(user, 'Mulai pasang verifikasi');
    await user.type(screen.getByLabelText('Kode verifikasi'), '123 456');
    await user.click(screen.getByRole('button', { name: 'Verifikasi dan aktifkan' }));

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' });
    expect(replace).toHaveBeenCalledWith('/psikolog/keamanan?berhasil=1');
    expect(replace).not.toHaveBeenCalledWith('/psikolog');
    expect(screen.queryByText(/Mengarahkanmu/)).not.toBeInTheDocument();
    // Mode pertama tidak memakai pesan tempat (itu untuk perangkat cadangan) dan tidak menyegarkan halaman sendiri.
    expect(screen.queryByText('Perangkat cadangan ditambahkan.')).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('kode salah: pesan galat, kolom dikosongkan, tidak berpindah halaman', async () => {
    mfa.challengeAndVerify.mockResolvedValue({ error: { status: 400 } });
    const user = userEvent.setup();
    render(<TotpEnrollment mode="first" />);
    await openScan(user, 'Mulai pasang verifikasi');
    await user.type(screen.getByLabelText('Kode verifikasi'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verifikasi dan aktifkan' }));

    expect(await screen.findByText(/Kode tidak cocok/)).toBeInTheDocument();
    expect(screen.getByLabelText('Kode verifikasi')).toHaveValue('');
    expect(replace).not.toHaveBeenCalled();
  });

  it('terlalu banyak percobaan (429) memakai pesan tunggu', async () => {
    mfa.challengeAndVerify.mockResolvedValue({ error: { status: 429 } });
    const user = userEvent.setup();
    render(<TotpEnrollment mode="first" />);
    await openScan(user, 'Mulai pasang verifikasi');
    await user.type(screen.getByLabelText('Kode verifikasi'), '111111');
    await user.click(screen.getByRole('button', { name: 'Verifikasi dan aktifkan' }));
    expect(await screen.findByText(/Terlalu banyak percobaan/)).toBeInTheDocument();
  });
});

describe('TotpEnrollment: perangkat cadangan', () => {
  it('berhasil: pesan di tempat dan halaman disegarkan, tanpa mengganti alamat', async () => {
    const user = userEvent.setup();
    render(<TotpEnrollment mode="backup" />);
    await openScan(user, 'Tambah perangkat cadangan');
    await user.type(screen.getByLabelText('Kode verifikasi'), '654321');
    await user.click(screen.getByRole('button', { name: 'Verifikasi dan aktifkan' }));

    expect(await screen.findByText('Perangkat cadangan ditambahkan.')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
