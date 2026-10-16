import { describe, expect, it } from 'vitest';
import { totpDeviceName } from './device-name';

describe('totpDeviceName (zona WIB, bukan UTC)', () => {
  it('kejadian nyata: 15 Okt 17.24 UTC adalah 16 Okt 00.24 WIB', () => {
    // Sebelumnya tertulis "Perangkat 2026-10-15 17:24" (UTC), berbeda tujuh jam dari jam di ponsel pemilik.
    expect(totpDeviceName(new Date('2026-10-15T17:24:00Z'))).toBe(
      'Perangkat 16 Okt 2026, 00.24 WIB',
    );
  });

  it('hari tanpa angka nol di depan, jam dan menit dua digit', () => {
    expect(totpDeviceName(new Date('2026-10-05T01:05:00Z'))).toBe(
      'Perangkat 5 Okt 2026, 08.05 WIB',
    );
    expect(totpDeviceName(new Date('2026-03-09T16:59:00Z'))).toBe(
      'Perangkat 9 Mar 2026, 23.59 WIB',
    );
  });

  it('tengah malam WIB tertulis 00.00 (bukan 24.00), dan batas tahun mengikuti WIB', () => {
    expect(totpDeviceName(new Date('2026-10-15T17:00:00Z'))).toBe(
      'Perangkat 16 Okt 2026, 00.00 WIB',
    );
    expect(totpDeviceName(new Date('2026-12-31T17:30:00Z'))).toBe(
      'Perangkat 1 Jan 2027, 00.30 WIB',
    );
  });

  it.each([
    ['2026-01-15T05:00:00Z', 'Jan'],
    ['2026-02-15T05:00:00Z', 'Feb'],
    ['2026-03-15T05:00:00Z', 'Mar'],
    ['2026-04-15T05:00:00Z', 'Apr'],
    ['2026-05-15T05:00:00Z', 'Mei'],
    ['2026-06-15T05:00:00Z', 'Jun'],
    ['2026-07-15T05:00:00Z', 'Jul'],
    ['2026-08-15T05:00:00Z', 'Agu'],
    ['2026-09-15T05:00:00Z', 'Sep'],
    ['2026-10-15T05:00:00Z', 'Okt'],
    ['2026-11-15T05:00:00Z', 'Nov'],
    ['2026-12-15T05:00:00Z', 'Des'],
  ])('%s memakai singkatan bulan Indonesia %s', (iso, month) => {
    expect(totpDeviceName(new Date(iso))).toBe(`Perangkat 15 ${month} 2026, 12.00 WIB`);
  });

  it('tidak memakai format ISO atau huruf T pemisah', () => {
    expect(totpDeviceName(new Date('2026-10-15T17:24:00Z'))).not.toMatch(
      /\d{4}-\d{2}-\d{2}|T\d{2}:/,
    );
  });
});
