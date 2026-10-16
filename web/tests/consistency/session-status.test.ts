import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { statusLabel } from '@/lib/domain/consultation/sessions';
import { scheduleStatusLabel } from '@/lib/domain/psychologist/schedule';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const ALL_SOURCES = [...sources('lib'), ...sources('components'), ...sources('app')];
const SINGLE_SOURCE = join('lib', 'domain', 'consultation', 'sessions.ts');

describe('label status sesi satu sumber', () => {
  it('status yang sama berlabel sama di Jadwal dan di halaman sesi pengguna', () => {
    for (const status of ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'aneh']) {
      expect(scheduleStatusLabel(status)).toBe(statusLabel(status));
    }
    expect(statusLabel('confirmed')).toBe('Terjadwal');
  });

  it('hanya lib/domain/consultation/sessions.ts yang memetakan status ke label', () => {
    const offenders = ALL_SOURCES.filter(
      (file) =>
        file !== SINGLE_SOURCE && /(^|[\s{,])confirmed:\s*'[A-Z]/m.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
    expect(readFileSync(SINGLE_SOURCE, 'utf8')).toMatch(/confirmed:\s*'Terjadwal'/);
  });

  it('kata "Terkonfirmasi" tidak dipakai sebagai label status sesi di mana pun', () => {
    const offenders = ALL_SOURCES.filter((file) =>
      /['"`]Terkonfirmasi['"`]/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
