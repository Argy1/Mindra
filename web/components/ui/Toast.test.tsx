import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

let api: ReturnType<typeof useToast>;

function Capture() {
  api = useToast();
  return null;
}

function setup() {
  return render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  );
}

function show(options: ToastOptions) {
  act(() => {
    api.toast(options);
  });
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('wilayah live ada di DOM sebelum ada toast (syarat agar diumumkan pembaca layar)', () => {
    setup();
    const region = screen.getByRole('region', { name: 'Notifikasi' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('toast info/berhasil memakai role="status"', () => {
    setup();
    show({ title: 'Tersimpan', description: 'Mood hari ini tercatat.', tone: 'success' });
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Tersimpan');
    expect(toast).toHaveTextContent('Mood hari ini tercatat.');
  });

  it('toast galat memakai role="alert" agar diumumkan segera', () => {
    setup();
    show({ title: 'Gagal menyimpan', tone: 'error' });
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal menyimpan');
  });

  it('hilang sendiri setelah 6 detik secara bawaan', () => {
    setup();
    show({ title: 'Sebentar' });
    expect(screen.getByText('Sebentar')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5900);
    });
    expect(screen.getByText('Sebentar')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Sebentar')).not.toBeInTheDocument();
  });

  it('galat menetap sampai ditutup (pengguna perlu waktu membaca cara memperbaiki)', () => {
    setup();
    show({ title: 'Koneksi terputus', tone: 'error' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Koneksi terputus')).toBeInTheDocument();
  });

  it('duration kustom dihormati', () => {
    setup();
    show({ title: 'Cepat', duration: 1000 });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('Cepat')).not.toBeInTheDocument();
  });

  it('tombol tutup menghapus toast', async () => {
    setup();
    show({ title: 'Halo', duration: null });
    await userEvent.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));
    expect(screen.queryByText('Halo')).not.toBeInTheDocument();
  });

  it('timer berhenti saat kursor di atas toast', async () => {
    setup();
    show({ title: 'Baca dulu', duration: 2000 });
    const toast = screen.getByRole('status');
    await userEvent.hover(toast);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Baca dulu')).toBeInTheDocument();
    await userEvent.unhover(toast);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryByText('Baca dulu')).not.toBeInTheDocument();
  });

  it('menampilkan paling banyak 3 toast sekaligus (yang tertua tergeser)', () => {
    setup();
    for (const title of ['Satu', 'Dua', 'Tiga', 'Empat']) show({ title, duration: null });
    expect(screen.queryByText('Satu')).not.toBeInTheDocument();
    expect(screen.getByText('Empat')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });

  it('useToast di luar provider memberi galat yang jelas', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
