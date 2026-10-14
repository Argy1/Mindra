import { cityKey, combineCells, type AggregateRow } from '@/lib/domain/faskes/dashboard';

/**
 * Model peta sebaran: satu gelembung per kota, diletakkan di titik tengah faskes publik kota itu (tabel
 * `facilities` memuat koordinat; profil pengguna tidak punya lokasi lebih halus dari nama kota, dan tidak
 * pernah dipakai di sini). Nilai gelembung berasal dari agregat k ≥ 10; kota yang disembunyikan database
 * tetap disembunyikan (digambar sebagai cincin kosong tanpa angka).
 */

export interface PinInput {
  id: string;
  name: string;
  type: string;
  city: string;
  lat: number;
  lng: number;
}

export type PhqBand = 'minimal' | 'mild' | 'moderate' | 'severe';

/** Batas yang sama dengan kategori PHQ-9 di aplikasi (0–4, 5–9, 10–14, 15+). */
export function phqBand(average: number): PhqBand {
  if (average < 5) return 'minimal';
  if (average < 10) return 'mild';
  if (average < 15) return 'moderate';
  return 'severe';
}

export const PHQ_BAND_LABEL: Readonly<Record<PhqBand, string>> = {
  minimal: 'Rata-rata 0–4',
  mild: 'Rata-rata 5–9',
  moderate: 'Rata-rata 10–14',
  severe: 'Rata-rata 15 ke atas',
};

export interface CityBubble {
  city: string;
  isOwn: boolean;
  hidden: boolean;
  /** Titik tengah faskes kota ini; null bila tidak ada faskes berkoordinat di kota itu. */
  position: { lat: number; lng: number } | null;
  avgPhq9: number | null;
  band: PhqBand | null;
  /** Rata-rata pengguna aktif per pekan yang tampil. */
  avgActiveUsers: number | null;
  facilityCount: number;
}

export interface MapModel {
  bubbles: CityBubble[];
  /** Faskes publik (titik pelayanan), diberi tanda faskes milik admin. */
  pins: Array<PinInput & { isOwn: boolean }>;
  hiddenCities: string[];
}

export function buildMapModel(input: {
  rows: readonly AggregateRow[];
  pins: readonly PinInput[];
  facilityId: string;
  facilityCity: string;
}): MapModel {
  const { rows, pins, facilityId, facilityCity } = input;
  const ownKey = cityKey(facilityCity);

  const pinsByCity = new Map<string, PinInput[]>();
  for (const pin of pins) {
    const key = cityKey(pin.city);
    pinsByCity.set(key, [...(pinsByCity.get(key) ?? []), pin]);
  }

  const groups = new Map<string, { label: string; rows: AggregateRow[] }>();
  for (const row of rows) {
    const key = cityKey(row.city);
    const group = groups.get(key) ?? { label: row.city, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  const bubbles = [...groups.entries()]
    .map(([key, group]): CityBubble => {
      const cells = combineCells(group.rows);
      const shown = group.rows.filter((row) => !row.suppressed && (row.activeUsers ?? 0) > 0);
      const cityPins = pinsByCity.get(key) ?? [];
      const avg = cells.phq9 === null ? null : Math.round(cells.phq9 * 10) / 10;
      return {
        city: group.label,
        isOwn: key === ownKey,
        hidden: avg === null,
        position:
          cityPins.length > 0
            ? {
                lat: cityPins.reduce((sum, pin) => sum + pin.lat, 0) / cityPins.length,
                lng: cityPins.reduce((sum, pin) => sum + pin.lng, 0) / cityPins.length,
              }
            : null,
        avgPhq9: avg,
        band: avg === null ? null : phqBand(avg),
        avgActiveUsers:
          shown.length > 0 && cells.activeUsers !== null
            ? Math.round(cells.activeUsers / shown.length)
            : null,
        facilityCount: cityPins.length,
      };
    })
    .sort((a, b) => {
      if (a.avgPhq9 === null && b.avgPhq9 === null) return a.city.localeCompare(b.city, 'id');
      if (a.avgPhq9 === null) return 1;
      if (b.avgPhq9 === null) return -1;
      return b.avgPhq9 - a.avgPhq9 || a.city.localeCompare(b.city, 'id');
    });

  return {
    bubbles,
    pins: pins.map((pin) => ({ ...pin, isOwn: pin.id === facilityId })),
    hiddenCities: bubbles.filter((bubble) => bubble.hidden).map((bubble) => bubble.city),
  };
}
