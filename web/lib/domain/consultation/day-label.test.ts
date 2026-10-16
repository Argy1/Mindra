import { describe, expect, it } from 'vitest';
import { dayAvailabilityLabel, generateSlots, type ScheduleRow, type Slot } from './slots';

const NOW = new Date('2026-10-14T10:00:00+07:00');
const WEEKDAYS: ScheduleRow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  start: '09:00:00',
  end: '16:00:00',
}));

const slot = (state: Slot['state'], hour = 9): Slot => ({
  startsAt: `2026-10-15T${String(hour).padStart(2, '0')}:00:00+07:00`,
  label: `${String(hour).padStart(2, '0')}.00`,
  state,
});

describe('dayAvailabilityLabel: libur, penuh, atau jumlah jam', () => {
  it('tanpa jadwal praktik hari itu: "libur" (bukan "penuh")', () => {
    expect(dayAvailabilityLabel({ date: '2026-10-17', slots: [] })).toBe('libur');
  });

  it('ada jadwal dan semua sudah dipesan: "penuh"', () => {
    expect(
      dayAvailabilityLabel({ date: '2026-10-15', slots: [slot('taken'), slot('taken', 10)] }),
    ).toBe('penuh');
  });

  it('ada yang tersedia: hanya jumlah jam yang tersedia', () => {
    expect(
      dayAvailabilityLabel({
        date: '2026-10-15',
        slots: [slot('taken'), slot('available', 10), slot('available', 11)],
      }),
    ).toBe('2 jam');
  });

  it('tidak ada yang bisa dipesan karena waktunya (terlalu dekat atau jauh): "tidak tersedia", bukan "penuh"', () => {
    expect(
      dayAvailabilityLabel({
        date: '2026-10-14',
        slots: [slot('too_soon'), slot('too_soon', 10)],
      }),
    ).toBe('tidak tersedia');
    expect(dayAvailabilityLabel({ date: '2026-11-20', slots: [slot('too_far')] })).toBe(
      'tidak tersedia',
    );
    // Campuran terlalu dekat dan sudah dipesan: ada jam yang memang penuh.
    expect(
      dayAvailabilityLabel({ date: '2026-10-14', slots: [slot('too_soon'), slot('taken', 10)] }),
    ).toBe('penuh');
  });

  it('Sabtu dan Minggu pada jadwal Senin sampai Jumat berlabel libur', () => {
    const days = generateSlots(WEEKDAYS, [], NOW, 7);
    const labels = Object.fromEntries(days.map((day) => [day.date, dayAvailabilityLabel(day)]));
    expect(labels['2026-10-17']).toBe('libur');
    expect(labels['2026-10-18']).toBe('libur');
    expect(labels['2026-10-15']).toBe('7 jam');
  });
});
