import { describe, expect, it } from 'vitest';
import type { AggregateRow } from './dashboard';
import { buildMapModel, phqBand, type PinInput } from './map';

const row = (
  overrides: Partial<AggregateRow> & { city: string; weekStart: string },
): AggregateRow => ({
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
});

const hidden = (city: string, weekStart: string): AggregateRow =>
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

const pin = (id: string, city: string, lat: number, lng: number): PinInput => ({
  id,
  name: `Faskes ${id}`,
  type: 'puskesmas',
  city,
  lat,
  lng,
});

describe('phqBand', () => {
  it('batas kategori PHQ-9: 0–4, 5–9, 10–14, 15+', () => {
    expect(phqBand(0)).toBe('minimal');
    expect(phqBand(4.9)).toBe('minimal');
    expect(phqBand(5)).toBe('mild');
    expect(phqBand(9.9)).toBe('mild');
    expect(phqBand(10)).toBe('moderate');
    expect(phqBand(14.9)).toBe('moderate');
    expect(phqBand(15)).toBe('severe');
    expect(phqBand(27)).toBe('severe');
  });
});

describe('buildMapModel', () => {
  const rows = [
    row({ city: 'Kota Bogor', weekStart: '2026-10-05', avgPhq9: 7.4, activeUsers: 24 }),
    row({ city: 'Kota Bogor', weekStart: '2026-09-28', avgPhq9: 7.4, activeUsers: 26 }),
    row({ city: 'Kota Depok', weekStart: '2026-10-05', avgPhq9: 11 }),
    hidden('Kab. Cianjur', '2026-10-05'),
    row({ city: 'Kota Tanpa Faskes', weekStart: '2026-10-05', avgPhq9: 3 }),
  ];
  const pins = [
    pin('a', 'Kota Bogor', -6.6, 106.8),
    pin('b', 'kota bogor ', -6.5, 106.9),
    pin('c', 'Kota Depok', -6.4, 106.8),
    pin('d', 'Kab. Cianjur', -6.8, 107.1),
  ];

  const model = buildMapModel({ rows, pins, facilityId: 'a', facilityCity: 'Kota Bogor' });

  it('gelembung diletakkan di titik tengah faskes kota; kota tanpa faskes tidak punya posisi', () => {
    const bogor = model.bubbles.find((bubble) => bubble.city === 'Kota Bogor')!;
    expect(bogor.position!.lat).toBeCloseTo(-6.55, 5);
    expect(bogor.position!.lng).toBeCloseTo(106.85, 5);
    expect(bogor.facilityCount).toBe(2);
    expect(
      model.bubbles.find((bubble) => bubble.city === 'Kota Tanpa Faskes')!.position,
    ).toBeNull();
  });

  it('nilai, pita, dan rata-rata pengguna aktif per pekan tampil', () => {
    const bogor = model.bubbles.find((bubble) => bubble.isOwn)!;
    expect(bogor).toMatchObject({ avgPhq9: 7.4, band: 'mild', avgActiveUsers: 25, hidden: false });
    expect(model.bubbles.find((bubble) => bubble.city === 'Kota Depok')!.band).toBe('moderate');
  });

  it('kota tersembunyi: tanpa angka dan tanpa pita, tetapi tetap punya posisi untuk cincin kosong', () => {
    const cianjur = model.bubbles.find((bubble) => bubble.city === 'Kab. Cianjur')!;
    expect(cianjur).toMatchObject({
      hidden: true,
      avgPhq9: null,
      band: null,
      avgActiveUsers: null,
    });
    expect(cianjur.position).not.toBeNull();
    expect(model.hiddenCities).toEqual(['Kab. Cianjur']);
  });

  it('urut dari rata-rata tertinggi; tersembunyi terakhir; faskes sendiri ditandai pada pin', () => {
    expect(model.bubbles.map((bubble) => bubble.city)).toEqual([
      'Kota Depok',
      'Kota Bogor',
      'Kota Tanpa Faskes',
      'Kab. Cianjur',
    ]);
    expect(model.pins.filter((entry) => entry.isOwn).map((entry) => entry.id)).toEqual(['a']);
  });
});
