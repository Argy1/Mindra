import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreathingExercise } from './BreathingExercise';

const status = () => screen.getByRole('status');
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

function press(name: string | RegExp) {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

function start() {
  press('Mulai napas terpandu');
}

describe('BreathingExercise', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('awal: penjelasan pola dan satu tombol mulai; wilayah status kosong', () => {
    render(<BreathingExercise />);
    expect(screen.getByText(/5 siklus, sekitar 70 detik/)).toBeInTheDocument();
    expect(screen.getByText(/Tarik napas 4 detik, tahan 4 detik/)).toBeInTheDocument();
    expect(screen.getByText(/hembuskan pelan 6 detik/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mulai napas terpandu' })).toBeEnabled();
    expect(status()).toHaveTextContent('');
  });

  it('mulai: fase pertama diumumkan, hitungan mundur disembunyikan dari pembaca layar', () => {
    render(<BreathingExercise />);
    start();
    expect(status()).toHaveTextContent('Tarik napas. Siklus 1 dari 5.');
    expect(screen.getByText('Siklus 1 dari 5')).toBeVisible();
    const countdown = screen.getByText('4');
    expect(countdown).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Berhenti' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mulai napas/ })).not.toBeInTheDocument();
  });

  it('pergantian fase mengikuti 4-4-6 dan siklus bertambah setelah 14 detik', () => {
    render(<BreathingExercise />);
    start();
    advance(3_999);
    expect(status()).toHaveTextContent('Tarik napas. Siklus 1 dari 5.');
    advance(400);
    expect(status()).toHaveTextContent('Tahan sebentar. Siklus 1 dari 5.');
    advance(4_000);
    expect(status()).toHaveTextContent('Hembuskan pelan. Siklus 1 dari 5.');
    advance(6_000);
    expect(status()).toHaveTextContent('Tarik napas. Siklus 2 dari 5.');
  });

  it('pengumuman hanya berubah di batas fase, bukan tiap detik (tidak berisik untuk pembaca layar)', () => {
    render(<BreathingExercise />);
    start();
    const seen = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      advance(1_000);
      seen.add(status().textContent ?? '');
    }
    // 12 detik: fase tarik, tahan, hembus (siklus 1) = 3 teks berbeda, bukan 12.
    expect(seen.size).toBe(3);
  });

  it('hitungan mundur tampil dan turun', () => {
    render(<BreathingExercise />);
    start();
    expect(screen.getByText('4')).toBeInTheDocument();
    advance(2_100);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('berhenti: kembali ke awal, pewaktu dibersihkan, tidak ada pembaruan lagi', () => {
    render(<BreathingExercise />);
    start();
    advance(5_000);
    press('Berhenti');
    expect(screen.getByRole('button', { name: 'Mulai napas terpandu' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('');
    expect(vi.getTimerCount()).toBe(0);
    advance(80_000);
    expect(status()).toHaveTextContent('');
    expect(screen.getByRole('button', { name: 'Mulai napas terpandu' })).toBeInTheDocument();
  });

  it('selesai setelah 70 detik: ucapan penutup, pengumuman, dan tombol ulangi', () => {
    render(<BreathingExercise />);
    start();
    advance(69_000);
    expect(screen.queryByText('Selesai')).not.toBeInTheDocument();
    advance(1_400);
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getAllByText(/menyelesaikan 5 siklus/).length).toBeGreaterThan(0);
    expect(status()).toHaveTextContent('Selesai. Kamu sudah menyelesaikan 5 siklus napas.');
    expect(screen.getByRole('button', { name: 'Ulangi napas terpandu' })).toBeEnabled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ulangi: mulai lagi dari siklus 1', () => {
    render(<BreathingExercise />);
    start();
    advance(71_000);
    press('Ulangi napas terpandu');
    expect(status()).toHaveTextContent('Tarik napas. Siklus 1 dari 5.');
  });

  it('dilepas di tengah latihan: pewaktu ikut dibersihkan', () => {
    const { unmount } = render(<BreathingExercise />);
    start();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lingkaran membesar saat tarik dan tahan, mengecil saat hembus (gerak dimatikan oleh CSS reduced-motion)', () => {
    const { container } = render(<BreathingExercise />);
    const circle = () =>
      container.querySelector('[aria-hidden="true"].rounded-full') as HTMLElement;
    expect(circle().className).toContain('scale-[0.62]');
    start();
    expect(circle().className).toContain('scale-100');
    expect(circle().style.transitionDuration).toBe('4s');
    advance(4_100);
    expect(circle().className).toContain('scale-100');
    advance(4_000);
    expect(circle().className).toContain('scale-[0.62]');
    expect(circle().style.transitionDuration).toBe('6s');
  });

  it('teks tanpa tanda seru dan tanpa meremehkan', () => {
    const { container } = render(<BreathingExercise />);
    expect(container.textContent).not.toContain('!');
    expect(container.textContent?.toLowerCase()).not.toMatch(/tenang aja|pasti bisa/);
  });
});
