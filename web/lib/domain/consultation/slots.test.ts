import { describe, expect, it } from 'vitest';
import {
  countAvailable,
  generateSlots,
  nextAvailable,
  slotsForDay,
  startsAtFor,
  type BookedRange,
  type ScheduleRow,
} from './slots';

// Rabu 14 Okt 2026, 10.00 WIB.
const NOW = new Date('2026-10-14T10:00:00+07:00');
const WEEKDAYS: ScheduleRow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  start: '09:00:00',
  end: '16:00:00',
}));

describe('startsAtFor', () => {
  it('ISO WIB dengan offset +07:00', () => {
    expect(startsAtFor('2026-10-15', 9 * 60)).toBe('2026-10-15T09:00:00+07:00');
    expect(startsAtFor('2026-10-15', 15 * 60 + 5)).toBe('2026-10-15T15:05:00+07:00');
  });
});

describe('slotsForDay: kisi jadwal', () => {
  it('09.00–16.00: tujuh slot (sesi 50 menit selesai sebelum 16.00 pada awal 15.00)', () => {
    const slots = slotsForDay('2026-10-15', WEEKDAYS, [], NOW);
    expect(slots.map((slot) => slot.label)).toEqual([
      '09.00',
      '10.00',
      '11.00',
      '12.00',
      '13.00',
      '14.00',
      '15.00',
    ]);
    expect(slots.every((slot) => slot.state === 'available')).toBe(true);
  });

  it('jadwal 09.00–11.30: hanya 09.00 dan 10.00, karena sesi 11.00 baru selesai 11.50', () => {
    const slots = slotsForDay(
      '2026-10-15',
      [{ dayOfWeek: 4, start: '09:00', end: '11:30' }],
      [],
      NOW,
    );
    expect(slots.map((slot) => slot.label)).toEqual(['09.00', '10.00']);
  });

  it('jadwal yang pas 50 menit menghasilkan satu slot; kurang dari 50 menit tidak ada', () => {
    expect(
      slotsForDay('2026-10-15', [{ dayOfWeek: 4, start: '09:00', end: '09:50' }], [], NOW),
    ).toHaveLength(1);
    expect(
      slotsForDay('2026-10-15', [{ dayOfWeek: 4, start: '09:00', end: '09:49' }], [], NOW),
    ).toHaveLength(0);
  });

  it('kisi mengikuti jam mulai jadwal, bukan jam bulat: mulai 08.30 → 08.30, 09.30, …', () => {
    const slots = slotsForDay(
      '2026-10-15',
      [{ dayOfWeek: 4, start: '08:30', end: '11:30' }],
      [],
      NOW,
    );
    expect(slots.map((slot) => slot.label)).toEqual(['08.30', '09.30', '10.30']);
  });

  it('dua blok jadwal sehari digabung, urut, tanpa duplikat', () => {
    const slots = slotsForDay(
      '2026-10-15',
      [
        { dayOfWeek: 4, start: '13:00', end: '15:00' },
        { dayOfWeek: 4, start: '09:00', end: '11:00' },
        { dayOfWeek: 4, start: '09:00', end: '10:00' },
      ],
      [],
      NOW,
    );
    expect(slots.map((slot) => slot.label)).toEqual(['09.00', '10.00', '13.00', '14.00']);
  });

  it('hari tanpa jadwal (Sabtu, Minggu) kosong', () => {
    expect(slotsForDay('2026-10-17', WEEKDAYS, [], NOW)).toEqual([]);
    expect(slotsForDay('2026-10-18', WEEKDAYS, [], NOW)).toEqual([]);
  });

  it('hari dalam seminggu dihitung dari kalender WIB (0 = Minggu)', () => {
    const sunday: ScheduleRow[] = [{ dayOfWeek: 0, start: '10:00', end: '11:00' }];
    expect(slotsForDay('2026-10-18', sunday, [], NOW)).toHaveLength(1);
    expect(slotsForDay('2026-10-17', sunday, [], NOW)).toHaveLength(0);
  });
});

describe('slotsForDay: keadaan', () => {
  it('kurang dari 1 jam dari sekarang: too_soon; tepat 1 jam: tersedia', () => {
    const slots = slotsForDay('2026-10-14', WEEKDAYS, [], NOW);
    const byLabel = Object.fromEntries(slots.map((slot) => [slot.label, slot.state]));
    expect(byLabel['09.00']).toBe('too_soon');
    expect(byLabel['10.00']).toBe('too_soon');
    expect(byLabel['11.00']).toBe('available'); // tepat 1 jam dari 10.00
    expect(byLabel['12.00']).toBe('available');
  });

  it('lebih dari 30 hari: too_far', () => {
    expect(
      slotsForDay('2026-11-16', WEEKDAYS, [], NOW).every((slot) => slot.state === 'too_far'),
    ).toBe(true);
    expect(
      slotsForDay('2026-11-12', WEEKDAYS, [], NOW).every((slot) => slot.state === 'available'),
    ).toBe(true);
    // Batas = tepat 30 hari dari sekarang (13 Nov 10.00): 09.00 dan 10.00 masih boleh, 11.00 sudah terlalu jauh.
    const edge = Object.fromEntries(
      slotsForDay('2026-11-13', WEEKDAYS, [], NOW).map((slot) => [slot.label, slot.state]),
    );
    expect(edge).toMatchObject({ '09.00': 'available', '10.00': 'available', '11.00': 'too_far' });
  });

  it('sesi aktif yang beririsan menandai slot terisi (termasuk irisan sebagian)', () => {
    const booked: BookedRange[] = [
      { scheduledAt: '2026-10-15T10:00:00+07:00', durationMinutes: 50 },
      { scheduledAt: '2026-10-15T12:30:00+07:00', durationMinutes: 50 }, // beririsan dengan 12.00 dan 13.00
    ];
    const states = Object.fromEntries(
      slotsForDay('2026-10-15', WEEKDAYS, booked, NOW).map((slot) => [slot.label, slot.state]),
    );
    expect(states).toMatchObject({
      '09.00': 'available',
      '10.00': 'taken',
      '11.00': 'available',
      '12.00': 'taken',
      '13.00': 'taken',
      '14.00': 'available',
    });
  });

  it('sesi yang berakhir tepat saat slot dimulai tidak menandainya terisi (rentang setengah terbuka)', () => {
    const booked: BookedRange[] = [
      { scheduledAt: '2026-10-15T09:10:00+07:00', durationMinutes: 50 },
    ];
    const states = Object.fromEntries(
      slotsForDay('2026-10-15', WEEKDAYS, booked, NOW).map((slot) => [slot.label, slot.state]),
    );
    expect(states['09.00']).toBe('taken'); // 09.00–09.50 beririsan dengan 09.10–10.00
    expect(states['10.00']).toBe('available'); // 10.00 mulai tepat saat sesi lain selesai
  });
});

describe('generateSlots', () => {
  it('14 hari berurutan mulai hari ini WIB, hari tanpa jadwal tetap ada', () => {
    const days = generateSlots(WEEKDAYS, [], NOW, 14);
    expect(days).toHaveLength(14);
    expect(days[0]!.date).toBe('2026-10-14');
    expect(days[13]!.date).toBe('2026-10-27');
    expect(days.find((day) => day.date === '2026-10-17')!.slots).toEqual([]);
  });

  it('memakai tanggal WIB: Rabu 23.30 UTC masih Kamis di WIB', () => {
    const late = new Date('2026-10-14T17:30:00Z'); // Kamis 15 Okt 00.30 WIB
    expect(generateSlots(WEEKDAYS, [], late, 1)[0]!.date).toBe('2026-10-15');
  });

  it('countAvailable dan nextAvailable', () => {
    const days = generateSlots(WEEKDAYS, [], NOW, 3);
    // Hari ini (Rabu): slot 11.00–15.00 = 5; Kamis 7; Jumat 7.
    expect(countAvailable(days)).toBe(19);
    expect(nextAvailable(days)).toMatchObject({ date: '2026-10-14', slot: { label: '11.00' } });
    expect(nextAvailable(generateSlots([], [], NOW, 14))).toBeNull();
  });
});
