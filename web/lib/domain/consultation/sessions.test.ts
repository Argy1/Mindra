import { describe, expect, it } from 'vitest';
import {
  isCancellable,
  isUpcoming,
  splitSessions,
  statusLabel,
  type SessionItem,
} from './sessions';

const NOW = new Date('2026-10-14T10:00:00+07:00');

const item = (overrides: Partial<SessionItem> & { id: string }): SessionItem => ({
  psychologistId: 'p1',
  psychologistName: 'Rina Sari',
  scheduledAt: '2026-10-15T10:00:00+07:00',
  durationMinutes: 50,
  status: 'confirmed',
  fee: 150000,
  ...overrides,
});

describe('isUpcoming', () => {
  it('sesi mendatang dan yang sedang berjalan', () => {
    expect(isUpcoming(item({ id: '1' }), NOW)).toBe(true);
    // Mulai 09.30, berakhir 10.20: masih berjalan pada 10.00.
    expect(
      isUpcoming(
        item({ id: '2', scheduledAt: '2026-10-14T09:30:00+07:00', status: 'ongoing' }),
        NOW,
      ),
    ).toBe(true);
    expect(
      isUpcoming(
        item({ id: '3', scheduledAt: '2026-10-14T09:30:00+07:00', status: 'confirmed' }),
        NOW,
      ),
    ).toBe(true);
  });

  it('sudah berakhir (tepat saat berakhir dianggap lewat), dibatalkan, atau selesai: bukan mendatang', () => {
    expect(isUpcoming(item({ id: '1', scheduledAt: '2026-10-14T09:10:00+07:00' }), NOW)).toBe(
      false,
    ); // berakhir 10.00 tepat
    expect(isUpcoming(item({ id: '2', status: 'cancelled' }), NOW)).toBe(false);
    expect(isUpcoming(item({ id: '3', status: 'completed' }), NOW)).toBe(false);
    expect(isUpcoming(item({ id: '4', status: 'status-asing' }), NOW)).toBe(false);
  });

  it('durasi 0 atau hilang memakai 50 menit', () => {
    expect(
      isUpcoming(
        item({ id: '1', durationMinutes: 0, scheduledAt: '2026-10-14T09:30:00+07:00' }),
        NOW,
      ),
    ).toBe(true);
  });
});

describe('isCancellable', () => {
  it('hanya pending atau confirmed yang belum dimulai', () => {
    expect(isCancellable(item({ id: '1' }), NOW)).toBe(true);
    expect(isCancellable(item({ id: '2', status: 'pending' }), NOW)).toBe(true);
    expect(isCancellable(item({ id: '3', status: 'ongoing' }), NOW)).toBe(false);
    expect(isCancellable(item({ id: '4', status: 'completed' }), NOW)).toBe(false);
    expect(isCancellable(item({ id: '5', status: 'cancelled' }), NOW)).toBe(false);
  });

  it('sesi yang sudah dimulai tidak bisa dibatalkan (batas tepat di awal sesi)', () => {
    expect(isCancellable(item({ id: '1', scheduledAt: '2026-10-14T09:59:00+07:00' }), NOW)).toBe(
      false,
    );
    expect(isCancellable(item({ id: '2', scheduledAt: '2026-10-14T10:00:00+07:00' }), NOW)).toBe(
      false,
    );
    expect(isCancellable(item({ id: '3', scheduledAt: '2026-10-14T10:01:00+07:00' }), NOW)).toBe(
      true,
    );
  });
});

describe('splitSessions', () => {
  const items = [
    item({ id: 'a', scheduledAt: '2026-10-19T14:00:00+07:00' }),
    item({ id: 'b', scheduledAt: '2026-10-15T10:00:00+07:00' }),
    item({ id: 'c', scheduledAt: '2026-10-06T10:00:00+07:00', status: 'completed' }),
    item({ id: 'd', scheduledAt: '2026-10-08T15:00:00+07:00', status: 'cancelled' }),
  ];

  it('mendatang urut paling dekat dulu; lewat urut paling baru dulu', () => {
    const { upcoming, past } = splitSessions(items, NOW);
    expect(upcoming.map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(past.map((entry) => entry.id)).toEqual(['d', 'c']);
  });

  it('tidak mengubah daftar asli dan tidak kehilangan sesi', () => {
    const snapshot = JSON.stringify(items);
    const { upcoming, past } = splitSessions(items, NOW);
    expect(JSON.stringify(items)).toBe(snapshot);
    expect(upcoming.length + past.length).toBe(items.length);
    expect(splitSessions([], NOW)).toEqual({ upcoming: [], past: [] });
  });
});

describe('statusLabel', () => {
  it('kalimat Indonesia untuk status dikenal; status asing apa adanya', () => {
    expect(statusLabel('confirmed')).toBe('Terjadwal');
    expect(statusLabel('pending')).toBe('Menunggu konfirmasi');
    expect(statusLabel('cancelled')).toBe('Dibatalkan');
    expect(statusLabel('lain')).toBe('lain');
  });
});
