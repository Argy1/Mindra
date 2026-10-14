import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/**
 * Jadwal sesi milik psikolog (fungsi murni). Data berasal dari RPC `psychologist_schedule`: nama klien hanya
 * ada bila klien menautkan akunnya (care_links aktif); memesan saja tidak membuka identitas.
 */

export interface ScheduleItem {
  id: string;
  /** ISO. */
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  clientName: string | null;
}

export interface ScheduleDay {
  /** Kunci tanggal WIB. */
  date: string;
  items: ScheduleItem[];
}

export const ANONYMOUS_CLIENT = 'Klien (belum menautkan akun)';

export const SCHEDULE_STATUS: Readonly<Record<string, string>> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Terjadwal',
  ongoing: 'Sedang berlangsung',
  completed: 'Selesai',
};

export const scheduleStatusLabel = (status: string): string => SCHEDULE_STATUS[status] ?? status;

/** Sesi dikelompokkan per hari WIB, urut waktu. `from` menentukan awal; hari tanpa sesi tidak dimunculkan. */
export function groupByDay(items: readonly ScheduleItem[]): ScheduleDay[] {
  const days = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = dateKeyWib(item.scheduledAt);
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      items: [...list].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    }));
}

/** Sesi yang belum berakhir (akan datang atau sedang berjalan) dan yang sudah lewat, dari semua sesi tersimpan. */
export function splitSchedule(
  items: readonly ScheduleItem[],
  now: Date,
): { upcoming: ScheduleItem[]; recent: ScheduleItem[] } {
  const ended = (item: ScheduleItem) =>
    new Date(item.scheduledAt).getTime() + item.durationMinutes * 60_000 <= now.getTime();
  return {
    upcoming: items.filter((item) => !ended(item) && item.status !== 'completed'),
    recent: items.filter((item) => ended(item) || item.status === 'completed'),
  };
}

/** Rentang yang dibaca: 7 hari ke belakang sampai 60 hari ke depan (batas RPC 93 hari). */
export function scheduleWindow(now: Date): { from: string; to: string } {
  const today = dateKeyWib(now);
  return {
    from: `${addDaysToKey(today, -7)}T00:00:00+07:00`,
    to: `${addDaysToKey(today, 60)}T00:00:00+07:00`,
  };
}

/** Sapaan hari: "Hari ini", "Besok", atau nama hari dan tanggal. */
export function relativeDayLabel(
  date: string,
  today: string,
): 'Hari ini' | 'Besok' | 'Kemarin' | null {
  if (date === today) return 'Hari ini';
  if (date === addDaysToKey(today, 1)) return 'Besok';
  if (date === addDaysToKey(today, -1)) return 'Kemarin';
  return null;
}
