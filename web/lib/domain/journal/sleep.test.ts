import { describe, expect, it } from 'vitest';
import { composeSleepWindow, formatDuration, SLEEP_PROBLEM_MESSAGE } from './sleep';

/** "Sekarang" = Selasa 13 Okt 2026, 09.00 WIB. */
const NOW = new Date('2026-10-13T09:00:00+07:00');

const compose = (wakeDate: string, bedtime: string, wakeTime: string, now = NOW) =>
  composeSleepWindow({ wakeDate, bedtime, wakeTime }, now);

describe('composeSleepWindow', () => {
  it('malam biasa: 22.30 → 06.00 menyeberang tengah malam (7,5 jam)', () => {
    const result = compose('2026-10-13', '22:30', '06:00');
    expect(result).toEqual({
      ok: true,
      bedtime: '2026-10-12T15:30:00.000Z', // 22.30 WIB tanggal 12
      wakeTime: '2026-10-12T23:00:00.000Z', // 06.00 WIB tanggal 13
      minutes: 450,
    });
  });

  it('tidur lewat tengah malam: 01.00 → 08.00 di hari yang sama (7 jam)', () => {
    const result = compose('2026-10-12', '01:00', '08:00');
    expect(result).toMatchObject({ ok: true, minutes: 420 });
  });

  it('tidur siang: 13.00 → 14.00 (60 menit)', () => {
    expect(compose('2026-10-12', '13:00', '14:00')).toMatchObject({ ok: true, minutes: 60 });
  });

  it('melewati batas bulan dan tahun', () => {
    const result = compose('2026-01-01', '23:00', '07:00', new Date('2026-01-02T09:00:00+07:00'));
    expect(result).toMatchObject({ ok: true, minutes: 480 });
    if (result.ok) expect(result.bedtime).toBe('2025-12-31T16:00:00.000Z');
  });

  it('menolak tanggal dan jam yang tidak valid', () => {
    expect(compose('2026-02-30', '22:00', '06:00')).toEqual({ ok: false, problem: 'invalid-date' });
    expect(compose('13-10-2026', '22:00', '06:00')).toEqual({ ok: false, problem: 'invalid-date' });
    expect(compose('', '22:00', '06:00')).toEqual({ ok: false, problem: 'invalid-date' });
    for (const bad of ['24:00', '9:30', '22:60', 'abc', '']) {
      expect(compose('2026-10-12', bad, '06:00'), bad).toEqual({
        ok: false,
        problem: 'invalid-time',
      });
      expect(compose('2026-10-12', '22:00', bad), bad).toEqual({
        ok: false,
        problem: 'invalid-time',
      });
    }
  });

  it('jam tidur sama dengan jam bangun ditolak', () => {
    expect(compose('2026-10-12', '06:00', '06:00')).toEqual({ ok: false, problem: 'same-time' });
  });

  it('durasi di luar 30 menit sampai 16 jam ditolak', () => {
    expect(compose('2026-10-12', '13:00', '13:20')).toEqual({ ok: false, problem: 'too-short' });
    expect(compose('2026-10-12', '13:00', '13:30')).toMatchObject({ ok: true, minutes: 30 });
    // 06.30 > 06.00 → dianggap malam sebelumnya: 23,5 jam
    expect(compose('2026-10-12', '06:30', '06:00')).toEqual({ ok: false, problem: 'too-long' });
    expect(compose('2026-10-12', '14:00', '06:00')).toMatchObject({ ok: true, minutes: 960 });
  });

  it('jam bangun di masa depan ditolak, dengan toleransi 10 menit', () => {
    expect(compose('2026-10-13', '22:00', '09:05')).toMatchObject({ ok: true });
    expect(compose('2026-10-13', '22:00', '10:00')).toEqual({ ok: false, problem: 'in-future' });
    expect(compose('2026-10-14', '22:00', '06:00')).toEqual({ ok: false, problem: 'in-future' });
  });

  it('terlalu lama: batas 60 hari ke belakang', () => {
    expect(compose('2026-08-14', '22:00', '06:00')).toMatchObject({ ok: true });
    expect(compose('2026-08-13', '22:00', '06:00')).toEqual({ ok: false, problem: 'too-old' });
  });

  it('memakai hari WIB untuk batas usia, bukan hari UTC', () => {
    // 00.30 WIB tanggal 13 = 17.30 UTC tanggal 12.
    const justAfterMidnight = new Date('2026-10-12T17:30:00Z');
    expect(compose('2026-08-14', '22:00', '06:00', justAfterMidnight)).toMatchObject({ ok: true });
  });

  it('setiap masalah punya pesan ramah tanpa tanda seru', () => {
    for (const message of Object.values(SLEEP_PROBLEM_MESSAGE)) {
      expect(message.length).toBeGreaterThan(15);
      expect(message).not.toContain('!');
    }
  });
});

describe('formatDuration', () => {
  it('menulis jam dan menit dalam bahasa Indonesia', () => {
    expect(formatDuration(450)).toBe('7 jam 30 menit');
    expect(formatDuration(60)).toBe('1 jam');
    expect(formatDuration(45)).toBe('45 menit');
    expect(formatDuration(0)).toBe('0 menit');
    expect(formatDuration(-5)).toBe('0 menit');
    expect(formatDuration(419.6)).toBe('7 jam');
  });
});
