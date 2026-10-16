import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpChallenge } from './TotpChallenge';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
const challengeAndVerify = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { mfa: { challengeAndVerify } } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  challengeAndVerify.mockResolvedValue({ error: null });
});

describe('TotpChallenge', () => {
  it('kode benar: sesi naik ke aal2, lalu berpindah ke tujuan dan menyegarkan data', async () => {
    const user = userEvent.setup();
    render(<TotpChallenge factorId="f9" redirectTo="/faskes" />);
    await user.type(screen.getByLabelText('Kode verifikasi'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verifikasi' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/faskes'));
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f9', code: '123456' });
    expect(refresh).toHaveBeenCalled();
  });

  it('kode salah: galat dan tidak berpindah', async () => {
    challengeAndVerify.mockResolvedValue({ error: { status: 400 } });
    const user = userEvent.setup();
    render(<TotpChallenge factorId="f9" />);
    await user.type(screen.getByLabelText('Kode verifikasi'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verifikasi' }));
    expect(await screen.findByText(/Kode tidak cocok/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
