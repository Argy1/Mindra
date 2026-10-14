import {
  buildDashboard,
  parsePeriod,
  periodRange,
  type AggregateRow,
  type PeriodKey,
} from '@/lib/domain/faskes/dashboard';
import { buildMapModel, type PinInput } from '@/lib/domain/faskes/map';
import { monthOptions, monthlyReport } from '@/lib/domain/faskes/report';
import type { ManagedFacility } from '@/lib/server/faskes-dashboard';
import { dateKeyWib } from '@/lib/utils/date';

/**
 * Data contoh untuk pratinjau portal faskes (/dev/faskes, /dev/faskes-peta, /dev/faskes-laporan).
 * 100% sintetis dan tetap: "sekarang" dibuat Rabu 14 Okt 2026, sehingga pekan berjalan (12 Okt) baru berjalan
 * dua hari dan Kota Bogor di pekan itu tertekan (kurang dari 10 pengguna), seperti di data sungguhan.
 */
export const SAMPLE_NOW = new Date('2026-10-14T10:00:00+07:00');

export const SAMPLE_FACILITY: ManagedFacility = {
  id: '00000000-0000-4000-8000-0000000fac00',
  name: 'Puskesmas Bogor Tengah',
  type: 'puskesmas',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
};

export const SAMPLE_FACILITIES: ManagedFacility[] = [SAMPLE_FACILITY];

interface CitySeries {
  city: string;
  /** Rata-rata PHQ-9 untuk 12 pekan terakhir yang LENGKAP (lama → baru); pekan berjalan ditambah terpisah. */
  phq9: number[];
  gad7: number[];
  users: number[];
  hidden?: boolean;
}

const BOGOR: CitySeries = {
  city: 'Kota Bogor',
  phq9: [6.8, 6.7, 7.0, 7.3, 7.1, 7.6, 7.9, 8.2, 8.9, 8.6, 7.9, 7.4],
  gad7: [5.9, 5.8, 6.1, 6.4, 6.2, 6.8, 7.2, 7.7, 8.0, 7.6, 7.0, 6.6],
  users: [96, 98, 101, 103, 104, 108, 112, 118, 121, 119, 117, 114],
};

const OTHERS: CitySeries[] = [
  {
    city: 'Kota Depok',
    phq9: [7.5, 7.6, 7.8, 7.9, 8.0, 8.2, 8.0, 8.3, 8.4, 8.2, 8.0, 8.1],
    gad7: [6.3, 6.4, 6.6, 6.7, 6.6, 6.9, 6.8, 7.0, 7.1, 6.9, 6.8, 6.9],
    users: [70, 72, 73, 75, 77, 78, 80, 82, 84, 83, 82, 81],
  },
  {
    city: 'Kota Bandung',
    phq9: [6.5, 6.6, 6.5, 6.8, 6.9, 7.0, 6.8, 7.1, 7.2, 7.0, 6.9, 6.9],
    gad7: [5.5, 5.6, 5.6, 5.8, 5.9, 6.0, 5.9, 6.1, 6.2, 6.0, 5.9, 5.9],
    users: [66, 67, 68, 70, 71, 72, 73, 75, 76, 75, 74, 74],
  },
  {
    // Kurang dari 10 pengguna aktif di setiap pekan: seluruhnya disembunyikan.
    city: 'Kab. Cianjur',
    phq9: [],
    gad7: [],
    users: [],
    hidden: true,
  },
];

const CATEGORY_SPLIT = { minimal: 0.38, mild: 0.34, moderate: 0.18, severe: 0.1 } as const;

function row(
  city: string,
  weekStart: string,
  series: CitySeries | null,
  index: number,
): AggregateRow {
  if (!series || series.hidden || series.users[index] === undefined) {
    return {
      city,
      province: 'Jawa Barat',
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
    };
  }
  const users = series.users[index]!;
  const assessed = Math.round(users * 0.62);
  const moderate = Math.round(assessed * CATEGORY_SPLIT.moderate);
  const severe = Math.round(assessed * CATEGORY_SPLIT.severe);
  const mild = Math.round(assessed * CATEGORY_SPLIT.mild);
  return {
    city,
    province: 'Jawa Barat',
    weekStart,
    suppressed: false,
    activeUsers: users,
    avgPhq9: series.phq9[index]!,
    avgGad7: series.gad7[index]!,
    avgPss10: 14 + (series.phq9[index]! - 7) * 0.8,
    minimal: assessed - moderate - severe - mild,
    mild,
    moderate,
    severe,
    crisisAlerts: Math.max(0, Math.round(severe / 3)),
  };
}

/** Baris agregat contoh: 12 pekan lengkap + pekan berjalan (Bogor tertekan karena baru dua hari). */
export function sampleRows(now: Date = SAMPLE_NOW): AggregateRow[] {
  const { weekStarts } = periodRange('52', now);
  const complete = weekStarts.slice(-13, -1);
  const current = weekStarts[weekStarts.length - 1]!;
  const rows: AggregateRow[] = [];
  complete.forEach((weekStart, index) => {
    for (const series of [BOGOR, ...OTHERS]) {
      rows.push(row(series.city, weekStart, series, index));
    }
  });
  rows.push(row('Kota Bogor', current, null, 0));
  return rows;
}

export function sampleTrend(periodParam?: string | string[]) {
  const period: PeriodKey = parsePeriod(periodParam);
  const range = periodRange(period, SAMPLE_NOW);
  const view = buildDashboard({
    rows: sampleRows().filter((entry) => entry.weekStart >= range.from),
    facilityCity: SAMPLE_FACILITY.city,
    province: SAMPLE_FACILITY.province,
    weekStarts: range.weekStarts,
    today: dateKeyWib(SAMPLE_NOW),
  });
  return { period, view };
}

const PINS: PinInput[] = [
  {
    id: SAMPLE_FACILITY.id,
    name: 'Puskesmas Bogor Tengah',
    type: 'puskesmas',
    city: 'Kota Bogor',
    lat: -6.5971,
    lng: 106.806,
  },
  {
    id: 'pin-2',
    name: 'RS Umum Bogor Utara',
    type: 'rumah_sakit',
    city: 'Kota Bogor',
    lat: -6.5611,
    lng: 106.806,
  },
  {
    id: 'pin-3',
    name: 'Klinik Pratama Bogor Selatan',
    type: 'klinik',
    city: 'Kota Bogor',
    lat: -6.5851,
    lng: 106.806,
  },
  {
    id: 'pin-4',
    name: 'Puskesmas Depok Utara',
    type: 'puskesmas',
    city: 'Kota Depok',
    lat: -6.3545,
    lng: 106.8062,
  },
  {
    id: 'pin-5',
    name: 'RS Umum Depok Selatan',
    type: 'rumah_sakit',
    city: 'Kota Depok',
    lat: -6.3785,
    lng: 106.8062,
  },
  {
    id: 'pin-6',
    name: 'Puskesmas Bandung Selatan',
    type: 'puskesmas',
    city: 'Kota Bandung',
    lat: -6.8815,
    lng: 107.6431,
  },
  {
    id: 'pin-7',
    name: 'RS Umum Bandung Tengah',
    type: 'rumah_sakit',
    city: 'Kota Bandung',
    lat: -6.8935,
    lng: 107.6431,
  },
  {
    id: 'pin-8',
    name: 'Puskesmas Cianjur Tengah',
    type: 'puskesmas',
    city: 'Kab. Cianjur',
    lat: -6.784,
    lng: 107.1785,
  },
];

export function sampleMap(periodParam?: string | string[]) {
  const period: PeriodKey = parsePeriod(periodParam);
  const range = periodRange(period, SAMPLE_NOW);
  const model = buildMapModel({
    rows: sampleRows().filter((entry) => entry.weekStart >= range.from),
    pins: PINS,
    facilityId: SAMPLE_FACILITY.id,
    facilityCity: SAMPLE_FACILITY.city,
  });
  return { period, model };
}

export function sampleReport(monthParam?: string) {
  const range = periodRange('52', SAMPLE_NOW);
  const months = monthOptions(range.weekStarts);
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0]!;
  return { months, month, rows: monthlyReport(sampleRows(), month) };
}
