import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormState } from '@/lib/auth/form-state';
import { ONBOARDING_STEPS } from '@/lib/domain/onboarding/steps';

const action = vi.hoisted(() => vi.fn());
vi.mock('@/lib/onboarding/actions', () => ({ dismissOnboardingAction: action }));

import { OnboardingCard } from './OnboardingCard';

beforeEach(() => {
  action.mockReset();
  action.mockResolvedValue({ status: 'success' } satisfies FormState);
});

describe('OnboardingCard', () => {
  it('bagian bernama dengan tiga langkah berurutan, masing-masing dengan tautan ke halamannya', () => {
    render(<OnboardingCard />);
    const section = screen.getByRole('region', { name: 'Selamat datang di Mindra' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
    const links = within(section).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      ONBOARDING_STEPS.map((step) => step.href),
    );
    expect(links.map((link) => link.textContent)).toEqual(ONBOARDING_STEPS.map((step) => step.cta));
    expect(within(section).getByText('Langkah 1')).toBeInTheDocument();
    expect(within(section).getByText('Langkah 3')).toBeInTheDocument();
  });

  it('judul bagian h2 dan judul langkah h3 (urutan judul tidak melompat dari h1 beranda)', () => {
    render(<OnboardingCard />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Selamat datang di Mindra' }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(
      ONBOARDING_STEPS.map((step) => step.title),
    );
  });

  it('menyembunyikan memanggil aksi sekali; tanpa pesan galat saat berhasil', async () => {
    const user = userEvent.setup();
    render(<OnboardingCard />);
    await user.click(screen.getByRole('button', { name: 'Sembunyikan panduan ini' }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('gagal menyimpan: pesan galat diumumkan dan panduan tetap tampil', async () => {
    action.mockResolvedValue({
      status: 'error',
      message: 'Sesimu sudah berakhir. Masuk lagi untuk menutup panduan.',
    } satisfies FormState);
    const user = userEvent.setup();
    render(<OnboardingCard />);
    await user.click(screen.getByRole('button', { name: 'Sembunyikan panduan ini' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sesimu sudah berakhir');
    expect(screen.getByRole('region', { name: 'Selamat datang di Mindra' })).toBeVisible();
  });

  it('teks menyapa "kamu", tanpa tanda seru, emoji, atau kata klinis terlarang', () => {
    const { container } = render(<OnboardingCard />);
    const text = container.textContent ?? '';
    expect(text).toContain('kamu');
    expect(text).not.toMatch(/!|\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\b(Anda|gangguan|diagnosa|pasien)\b/i);
  });
});
