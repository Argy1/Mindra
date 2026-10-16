import { SESSION_MINUTES } from '@/lib/domain/consultation/slots';

/** Sesi milik pengguna untuk halaman "Sesi kamu". Fungsi murni. */

export interface SessionItem {
  id: string;
  psychologistId: string;
  psychologistName: string;
  /** ISO. */
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  fee: number;
}

/**
 * Satu-satunya sumber label status sesi: dipakai halaman "Sesi kamu", Jadwal, dasbor, dan detail klien, supaya
 * status yang sama tidak tampil dengan dua kata berbeda di dua tempat.
 */
export const STATUS_LABEL: Readonly<Record<string, string>> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Terjadwal',
  ongoing: 'Sedang berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const statusLabel = (status: string): string => STATUS_LABEL[status] ?? status;

/** Sesi yang masih akan datang atau sedang berjalan dan belum dibatalkan atau selesai. */
export function isUpcoming(item: SessionItem, now: Date): boolean {
  if (item.status !== 'pending' && item.status !== 'confirmed' && item.status !== 'ongoing')
    return false;
  const end =
    new Date(item.scheduledAt).getTime() + (item.durationMinutes || SESSION_MINUTES) * 60_000;
  return end > now.getTime();
}

/** Dapat dibatalkan: pending atau confirmed dan belum dimulai. */
export function isCancellable(item: SessionItem, now: Date): boolean {
  return (
    (item.status === 'pending' || item.status === 'confirmed') &&
    new Date(item.scheduledAt).getTime() > now.getTime()
  );
}

export function splitSessions(
  items: readonly SessionItem[],
  now: Date,
): { upcoming: SessionItem[]; past: SessionItem[] } {
  const byStart = (a: SessionItem, b: SessionItem) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  return {
    upcoming: items.filter((item) => isUpcoming(item, now)).sort(byStart),
    past: items.filter((item) => !isUpcoming(item, now)).sort((a, b) => byStart(b, a)),
  };
}
