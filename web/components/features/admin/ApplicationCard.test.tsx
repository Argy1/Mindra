import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PendingPsychologist } from '@/lib/server/admin';
import { ApplicationCard } from './ApplicationCard';

vi.mock('@/lib/admin/actions', () => ({ reviewPsychologistAction: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const applicant = (strNumber: string | null): PendingPsychologist => ({
  id: '00000000-0000-4000-8000-0000000000b1',
  name: 'Calon Psikolog',
  email: 'calon@t.test',
  createdAt: '2026-10-12T03:20:00.000Z',
  strNumber,
});

async function openApprove(strNumber: string | null) {
  const user = userEvent.setup();
  render(<ApplicationCard applicant={applicant(strNumber)} />);
  await user.click(screen.getByRole('button', { name: /Tinjau dan setujui/ }));
  return screen.findByRole('dialog');
}

describe('ApplicationCard: nomor STR dari pendaftaran', () => {
  it('kartu menampilkan STR dari pemohon (atau menyatakan belum diisi)', () => {
    const { unmount } = render(<ApplicationCard applicant={applicant('STR-0123 4567')} />);
    expect(screen.getByText('STR dari pemohon: STR-0123 4567')).toBeInTheDocument();
    unmount();
    render(<ApplicationCard applicant={applicant(null)} />);
    expect(screen.getByText('STR belum diisi')).toBeInTheDocument();
  });

  it('dialog persetujuan sudah terisi nomor STR dari pemohon; admin tinggal mencocokkan', async () => {
    const dialog = await openApprove('STR-0123 4567');
    const field = within(dialog).getByLabelText(/Nomor STR/);
    expect(field).toHaveValue('STR-0123 4567');
    expect(
      within(dialog).getByText(/Cocokkan dengan sumber resmi sebelum menyetujui/),
    ).toBeInTheDocument();
  });

  it('pemohon lama tanpa STR: kolom kosong dan admin diminta mengisinya setelah memeriksa', async () => {
    const dialog = await openApprove(null);
    expect(within(dialog).getByLabelText(/Nomor STR/)).toHaveValue('');
    expect(within(dialog).getByText(/tidak mengisi nomor STR saat mendaftar/)).toBeInTheDocument();
  });
});

describe('ApplicationCard: jam praktik 24 jam', () => {
  it('jam mulai dan selesai berupa pilihan 24 jam (bukan input time bergantung locale), bawaan 09:00 dan 15:00', async () => {
    const dialog = await openApprove(null);
    const start = within(dialog).getByLabelText(/Jam mulai/) as HTMLSelectElement;
    const end = within(dialog).getByLabelText(/Jam selesai/) as HTMLSelectElement;
    expect(start.tagName).toBe('SELECT');
    expect(end.tagName).toBe('SELECT');
    expect(start).toHaveValue('09:00');
    expect(end).toHaveValue('15:00');
    expect(start).toHaveAttribute('name', 'start');
    expect(end).toHaveAttribute('name', 'end');
    expect(start.options).toHaveLength(48);
    expect(Array.from(start.options).some((option) => /AM|PM/i.test(option.text))).toBe(false);
    expect(dialog.querySelector('input[type="time"]')).toBeNull();
  });
});
