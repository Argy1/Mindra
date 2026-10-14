import { addDaysToKey, dateKeyWib, formatDateId, weekdayLongId } from '@/lib/utils/date';
import { csvCell } from '@/lib/utils/csv';

/** Satu baris riwayat akses (dari RPC `my_access_log`). */
export interface AccessLogEntry {
  id: number | string;
  actorName: string;
  actorRole: string;
  resource: string;
  action: string;
  /** ISO. */
  createdAt: string;
}

const RESOURCE_PHRASE: Readonly<Record<string, string>> = {
  assessments: 'hasil skrining',
  mood: 'mood harian',
  sleep: 'catatan tidur',
  crisis_alerts: 'peringatan krisis',
  ai_summary: 'ringkasan teman cerita',
};

const ROLE_LABEL: Readonly<Record<string, string>> = {
  psychologist: 'Psikolog',
  caregiver: 'Pendamping',
  facility_admin: 'Admin faskes',
  admin: 'Admin',
  user: 'Pengguna',
};

/** "membuka hasil skrining", "menandai peringatan krisis sudah ditangani", "mengunduh mood harian". */
export function describeAction(resource: string, action: string): string {
  const what = RESOURCE_PHRASE[resource] ?? 'datamu';
  if (action === 'export') return `mengunduh ${what}`;
  if (action === 'acknowledge') return `menandai ${what} sudah ditangani`;
  return `membuka ${what}`;
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? 'Pengguna';
}

export interface AccessLogGroup {
  /** "Hari ini", "Kemarin", atau "Senin, 12 Oktober". */
  label: string;
  entries: AccessLogEntry[];
}

/** Mengelompokkan per hari WIB, terbaru dulu. `now` bisa diganti untuk pengujian. */
export function groupAccessLogByDay(
  entries: readonly AccessLogEntry[],
  now: Date = new Date(),
): AccessLogGroup[] {
  const today = dateKeyWib(now);
  const yesterday = addDaysToKey(today, -1);
  const groups = new Map<string, AccessLogGroup>();

  for (const entry of entries) {
    const key = dateKeyWib(entry.createdAt);
    let group = groups.get(key);
    if (!group) {
      const label =
        key === today
          ? 'Hari ini'
          : key === yesterday
            ? 'Kemarin'
            : `${weekdayLongId(key)}, ${formatDateId(new Date(`${key}T12:00:00+07:00`), { day: 'numeric', month: 'long' })}`;
      group = { label, entries: [] };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, group]) => group);
}

export { csvCell };

export const ACCESS_LOG_CSV_HEADER = ['waktu_wib', 'pelaku', 'peran', 'data', 'aksi'] as const;

/** CSV riwayat akses (UTF-8 dengan BOM supaya Excel membaca huruf Indonesia dengan benar). */
export function accessLogToCsv(entries: readonly AccessLogEntry[]): string {
  const rows = entries.map((entry) =>
    [
      new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(entry.createdAt)),
      entry.actorName,
      roleLabel(entry.actorRole),
      RESOURCE_PHRASE[entry.resource] ?? entry.resource,
      entry.action,
    ]
      .map(csvCell)
      .join(','),
  );
  return `﻿${[ACCESS_LOG_CSV_HEADER.join(','), ...rows].join('\r\n')}\r\n`;
}
