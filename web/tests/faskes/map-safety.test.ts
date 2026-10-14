import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bubbleText, tooltipElement } from '@/components/features/faskes/FaskesMap';
import type { CityBubble } from '@/lib/domain/faskes/map';

/**
 * Nama kota di peta berasal dari kolom profil yang diisi pengguna. Leaflet memasukkan string ke `innerHTML`
 * untuk tooltip dan popup, jadi nama seperti `<img onerror=...>` akan dieksekusi di peramban admin faskes.
 * Komponen ini hanya boleh memberi Leaflet NODE DOM (textContent).
 */
const SOURCE = readFileSync(
  path.resolve(import.meta.dirname, '../../components/features/faskes/FaskesMap.tsx'),
  'utf8',
);

const HOSTILE = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

describe('tooltipElement', () => {
  it('menjadikan teks berbahaya sebagai teks biasa, bukan elemen', () => {
    const element = tooltipElement(HOSTILE);
    expect(element.children).toHaveLength(0);
    expect(element.textContent).toBe(HOSTILE);
    expect(element.innerHTML).not.toContain('<img');
  });
});

describe('bubbleText', () => {
  const base: CityBubble = {
    city: HOSTILE,
    isOwn: false,
    hidden: false,
    position: { lat: 0, lng: 0 },
    avgPhq9: 7.4,
    band: 'mild',
    avgActiveUsers: 25,
    facilityCount: 1,
  };

  it('kota tampil: nama, rata-rata berformat Indonesia, dan pengguna aktif', () => {
    expect(bubbleText({ ...base, city: 'Kota Bogor' })).toBe(
      'Kota Bogor: rata-rata PHQ-9 7,4, sekitar 25 orang aktif per pekan',
    );
  });

  it('kota tersembunyi tidak membocorkan angka', () => {
    const text = bubbleText({
      ...base,
      city: 'Kab. Cianjur',
      hidden: true,
      avgPhq9: null,
      avgActiveUsers: null,
    });
    expect(text).toBe('Kab. Cianjur: disembunyikan, kurang dari 10 pengguna');
  });
});

describe('FaskesMap.tsx (pemindaian kode)', () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '');

  it('tidak memakai innerHTML atau popup berbasis string', () => {
    expect(code).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|dangerouslySetInnerHTML/);
    expect(code).not.toMatch(/\.bindPopup\(/);
    expect(code).not.toMatch(/\.setContent\(/);
  });

  it('setiap bindTooltip menerima elemen dari tooltipElement', () => {
    const calls = [...code.matchAll(/\.bindTooltip\(([^)]*)\)/g)].map((match) => match[1]!.trim());
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const argument of calls) expect(argument.startsWith('tooltipElement(')).toBe(true);
  });

  it('wadah peta tidak menjebak gulir halaman (zoom roda mati) dan punya label', () => {
    expect(code).toContain('scrollWheelZoom: false');
    expect(code).toMatch(/aria-label=\{label\}/);
  });
});
