import { describe, expect, it } from 'vitest';
import {
  buildDashboard,
  cityKey,
  mondayOf,
  parsePeriod,
  percentages,
  periodRange,
  trendNote,
  weekRangeLabel,
  weekShortLabel,
  type AggregateRow,
  type WeekPoint,
} from './dashboard';

const TODAY = '2026-10-14'; // Rabu; pekan berjalan dimulai Senin 2026-10-12

function row(overrides: Partial<AggregateRow> & { city: string; weekStart: string }): AggregateRow {
  return {
    province: 'Jawa Barat',
    suppressed: false,
    activeUsers: 20,
    avgPhq9: 7,
    avgGad7: 6,
    avgPss10: 15,
    minimal: 10,
    mild: 5,
    moderate: 3,
    severe: 2,
    crisisAlerts: 1,
    ...overrides,
  };
}

const hiddenRow = (city: string, weekStart: string): AggregateRow =>
  row({
    city,
    weekStart,
    suppressed: true,
    activeUsers: null,
    avgPhq9: null,
    avgGad7: null,
    avgPss10: null,
    minimal: null,
    mild: null,
    moderate: null,
    severe: null,
    crisisAlerts: null,
  });

const WEEKS = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'];

function build(rows: AggregateRow[], facilityCity = 'Kota Bogor') {
  return buildDashboard({
    rows,
    facilityCity,
    province: 'Jawa Barat',
    weekStarts: WEEKS,
    today: TODAY,
  });
}

describe('periode', () => {
  it('Senin dari pekan yang memuat tanggal, termasuk hari Minggu', () => {
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    expect(mondayOf('2026-10-14')).toBe('2026-10-12');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
    expect(mondayOf('2026-10-19')).toBe('2026-10-19');
    expect(mondayOf('2026-01-01')).toBe('2025-12-29');
  });

  it('rentang berakhir di pekan berjalan dan tetap dalam batas 400 hari database', () => {
    const now = new Date('2026-10-14T03:00:00Z');
    const twelve = periodRange('12', now);
    expect(twelve.weekStarts).toHaveLength(12);
    expect(twelve.weekStarts.at(-1)).toBe('2026-10-12');
    expect(twelve.weekStarts[0]).toBe('2026-07-27');
    expect(twelve.from).toBe('2026-07-27');
    expect(twelve.to).toBe('2026-10-14');

    const year = periodRange('52', now);
    const days =
      (new Date(`${year.to}T00:00:00Z`).getTime() - new Date(`${year.from}T00:00:00Z`).getTime()) /
      86_400_000;
    expect(year.weekStarts).toHaveLength(52);
    expect(days).toBeLessThanOrEqual(400);
    expect(periodRange('4', now).weekStarts).toHaveLength(4);
  });

  it('memakai tanggal WIB, bukan UTC: Minggu 23.30 UTC sudah Senin di WIB', () => {
    // 2026-10-18T17:30Z = Senin 2026-10-19 00.30 WIB: pekan berjalan sudah pekan berikutnya.
    const range = periodRange('4', new Date('2026-10-18T17:30:00Z'));
    expect(range.weekStarts.at(-1)).toBe('2026-10-19');
    expect(range.to).toBe('2026-10-19');
  });

  it('nilai periode tak dikenal jatuh ke 12 minggu', () => {
    expect(parsePeriod(undefined)).toBe('12');
    expect(parsePeriod('4')).toBe('4');
    expect(parsePeriod(['52', '4'])).toBe('52');
    for (const bad of ['', '7', '12; drop', '0', '-4', '052']) expect(parsePeriod(bad)).toBe('12');
  });
});

describe('percentages', () => {
  it('selalu berjumlah 100 (pembulatan terbesar-sisa)', () => {
    for (const counts of [
      [1, 1, 1],
      [10, 5, 3, 2],
      [33, 33, 34],
      [1, 0, 0, 0],
      [7, 11, 13, 17],
    ]) {
      expect(percentages(counts).reduce((a, b) => a + b, 0)).toBe(100);
    }
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('total nol tidak menghasilkan NaN', () => {
    expect(percentages([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });
});

describe('buildDashboard: lingkup dan pekan', () => {
  it('memakai kota faskes bila ada sel yang tampil, tanpa menjumlah kota lain', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 25, avgPhq9: 8 }),
      row({ city: 'Kota Depok', weekStart: '2026-10-05', activeUsers: 40, avgPhq9: 4 }),
    ]);
    expect(view.scope).toEqual({ kind: 'city', city: 'Kota Bogor' });
    expect(view.summary.activeUsers.value).toBe(25);
    expect(view.summary.avgPhq9.value).toBe(8);
  });

  it('pencocokan kota tidak peka huruf besar dan spasi (sama dengan lower(btrim()))', () => {
    expect(cityKey('  Kota Bogor ')).toBe(cityKey('kota bogor'));
    const view = build([row({ city: 'kota bogor', weekStart: '2026-10-05' })], '  Kota Bogor');
    expect(view.scope.kind).toBe('city');
  });

  it('kota faskes tertekan seluruhnya: jatuh ke provinsi, rata-rata tertimbang pengguna aktif', () => {
    const view = build([
      hiddenRow('Kota Bogor', '2026-10-05'),
      row({ city: 'Kota Depok', weekStart: '2026-10-05', activeUsers: 30, avgPhq9: 9 }),
      row({ city: 'Kota Bandung', weekStart: '2026-10-05', activeUsers: 10, avgPhq9: 5 }),
    ]);
    expect(view.scope).toEqual({ kind: 'province', province: 'Jawa Barat' });
    expect(view.summary.activeUsers.value).toBe(40);
    expect(view.summary.avgPhq9.value).toBe(8); // (9*30 + 5*10) / 40
  });

  it('sel tertekan TIDAK pernah ikut dijumlahkan, dan pekannya ditandai suppressed', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 20 }),
      hiddenRow('Kota Bogor', '2026-09-28'),
    ]);
    const states = Object.fromEntries(view.weeks.map((week) => [week.weekStart, week.state]));
    expect(states).toMatchObject({
      '2026-09-28': 'suppressed',
      '2026-10-05': 'shown',
      '2026-09-14': 'none',
    });
    expect(view.weeks.find((week) => week.weekStart === '2026-09-28')!.phq9).toBeNull();
  });

  it('sel bertanda tertekan TIDAK dihitung walau (data rusak) masih membawa angka', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 25, avgPhq9: 7 }),
      row({
        city: 'Kota Bogor',
        weekStart: '2026-09-28',
        suppressed: true,
        activeUsers: 40,
        avgPhq9: 20,
      }),
    ]);
    const week = view.weeks.find((entry) => entry.weekStart === '2026-09-28')!;
    expect(week).toMatchObject({ state: 'suppressed', activeUsers: null, phq9: null });
    expect(view.summary.activeUsers).toEqual({ value: 25, delta: null });
  });

  it('tidak ada satu pun sel tampil: kosong, tanpa angka mengambang', () => {
    const view = build([hiddenRow('Kota Bogor', '2026-10-05')]);
    expect(view.empty).toBe(true);
    expect(view.summary.activeUsers.value).toBeNull();
    expect(view.summary.avgPhq9.value).toBeNull();
    expect(view.summary.severeShare.value).toBeNull();
    expect(view.note).toBeNull();
  });
});

describe('buildDashboard: ringkasan', () => {
  it('memakai pekan lengkap terakhir, bukan pekan berjalan yang baru berjalan dua hari', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-09-28', activeUsers: 30, avgPhq9: 6 }),
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 28, avgPhq9: 7 }),
      row({ city: 'Kota Bogor', weekStart: '2026-10-12', activeUsers: 12, avgPhq9: 3 }),
    ]);
    expect(view.summary.weekStart).toBe('2026-10-05');
    expect(view.summary.activeUsers).toEqual({ value: 28, delta: -2 });
    expect(view.summary.avgPhq9).toEqual({ value: 7, delta: 1 });
  });

  it('selisih hanya bila pekan sebelumnya (tepat 7 hari) tampil', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-09-21', activeUsers: 30 }),
      hiddenRow('Kota Bogor', '2026-09-28'),
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 28 }),
    ]);
    expect(view.summary.activeUsers).toEqual({ value: 28, delta: null });
  });

  it('persen sedang atau berat dari kategori; selisih dalam poin', () => {
    const view = build([
      row({
        city: 'Kota Bogor',
        weekStart: '2026-09-28',
        minimal: 10,
        mild: 5,
        moderate: 3,
        severe: 2,
      }),
      row({
        city: 'Kota Bogor',
        weekStart: '2026-10-05',
        minimal: 8,
        mild: 4,
        moderate: 5,
        severe: 3,
      }),
    ]);
    // (3+2)/20 = 25%; (5+3)/20 = 40%
    expect(view.summary.severeShare).toEqual({ value: 40, delta: 15 });
  });

  it('kategori tak lengkap (null) tidak menghasilkan persen palsu', () => {
    const view = build([row({ city: 'Kota Bogor', weekStart: '2026-10-05', minimal: null })]);
    expect(view.summary.severeShare.value).toBeNull();
  });

  it('peringatan krisis dijumlah dari pekan tampil saja', () => {
    const view = build([
      row({ city: 'Kota Bogor', weekStart: '2026-09-28', crisisAlerts: 2 }),
      row({ city: 'Kota Bogor', weekStart: '2026-10-05', crisisAlerts: 3 }),
      hiddenRow('Kota Bogor', '2026-09-21'),
    ]);
    expect(view.summary.crisisAlerts).toBe(5);
  });
});

describe('buildDashboard: perbandingan kota dan sebaran', () => {
  const rows = [
    row({ city: 'Kota Bogor', weekStart: '2026-10-05', avgPhq9: 7.4 }),
    row({ city: 'Kota Depok', weekStart: '2026-10-05', avgPhq9: 8.1 }),
    row({ city: 'Kota Bandung', weekStart: '2026-10-05', avgPhq9: 6.9 }),
    hiddenRow('Kab. Cianjur', '2026-10-05'),
    hiddenRow('Kab. Cianjur', '2026-09-28'),
  ];

  it('urut dari rata-rata tertinggi; kota tersembunyi di bawah tanpa angka; kota sendiri ditandai', () => {
    const view = build(rows);
    expect(view.cities.map((city) => city.city)).toEqual([
      'Kota Depok',
      'Kota Bogor',
      'Kota Bandung',
      'Kab. Cianjur',
    ]);
    expect(view.cities.find((city) => city.isOwn)!.city).toBe('Kota Bogor');
    const cianjur = view.cities.at(-1)!;
    expect(cianjur).toMatchObject({ hidden: true, avgPhq9: null, weeksShown: 0 });
    expect(view.hiddenCities).toEqual(['Kab. Cianjur']);
  });

  it('sebaran kategori per kota berjumlah 100 dan kota tersembunyi tidak punya persen', () => {
    const view = build(rows);
    for (const share of view.distribution.filter((entry) => !entry.hidden)) {
      const p = share.percent!;
      expect(p.minimal + p.mild + p.moderate + p.severe).toBe(100);
    }
    expect(view.distribution.at(-1)).toMatchObject({
      city: 'Kab. Cianjur',
      hidden: true,
      percent: null,
    });
  });

  it('kota yang sebagian pekannya tertekan memakai pekan yang tampil saja', () => {
    const view = build([
      row({ city: 'Kota Depok', weekStart: '2026-09-28', avgPhq9: 10, activeUsers: 10 }),
      hiddenRow('Kota Depok', '2026-10-05'),
    ]);
    expect(view.cities[0]).toMatchObject({
      city: 'Kota Depok',
      avgPhq9: 10,
      weeksShown: 1,
      hidden: false,
    });
  });
});

describe('trendNote', () => {
  const week = (weekStart: string, phq9: number | null): WeekPoint => ({
    weekStart,
    state: phq9 === null ? 'none' : 'shown',
    activeUsers: phq9 === null ? null : 20,
    phq9,
    gad7: null,
    pss10: null,
  });
  const series = (...values: (number | null)[]) =>
    values.map((value, index) => week(`2026-09-${String(index + 1).padStart(2, '0')}`, value));

  it('naik, turun, stabil dengan ambang 1 poin; angka berformat Indonesia', () => {
    expect(trendNote(series(6, 6.2, 7.4, 7.6))).toMatch(/naik 1,4 poin/);
    expect(trendNote(series(8, 8, 6.5, 6.5))).toMatch(/turun 1,5 poin/);
    expect(trendNote(series(7, 7.2, 7.4, 7.5))).toMatch(/stabil/);
  });

  it('kurang dari 4 pekan bernilai: tidak ada catatan', () => {
    expect(trendNote(series(6, null, 7, 8))).toBeNull();
    expect(trendNote([])).toBeNull();
  });

  it('tidak menyebut sebab (tanpa klaim kausal) dan tidak memakai kata klinis', () => {
    for (const values of [
      [6, 6, 8, 8],
      [8, 8, 6, 6],
      [7, 7, 7, 7],
    ] as const) {
      const note = trendNote(series(...values))!;
      expect(note).not.toMatch(/karena|disebabkan|akibat|gangguan|diagnosa|pasien|!/i);
    }
  });
});

describe('label pekan', () => {
  it('rentang dalam satu bulan dan lintas bulan', () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5–11 Okt');
    expect(weekRangeLabel('2026-09-28')).toBe('28 Sep – 4 Okt');
    expect(weekRangeLabel('2026-12-28')).toBe('28 Des – 3 Jan');
    expect(weekShortLabel('2026-10-06')).toBe('6 Okt');
  });
});
