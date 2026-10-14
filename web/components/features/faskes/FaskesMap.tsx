'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { MapModel, PhqBand } from '@/lib/domain/faskes/map';
import { formatDecimalId } from '@/lib/utils/date';

/** Warna per pita, dibaca dari token desain saat dipasang (satu sumber kebenaran, ikut tema). */
const BAND_TOKEN: Readonly<Record<PhqBand, string>> = {
  minimal: '--success-500',
  mild: '--info-500',
  moderate: '--warning-500',
  severe: '--danger-500',
};

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; kontributor <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * Isi tooltip sebagai NODE TEKS, bukan string HTML. Nama kota berasal dari isian pengguna di profil; Leaflet
 * memasukkan string ke `innerHTML`, jadi nama seperti `<img onerror=...>` akan dieksekusi. `textContent`
 * menutup celah itu. (tests/faskes/map-safety.test.ts menjaga agar tidak ada jalur string yang lolos.)
 */
export function tooltipElement(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  return element;
}

export function bubbleText(bubble: MapModel['bubbles'][number]): string {
  if (bubble.avgPhq9 === null) return `${bubble.city}: disembunyikan, kurang dari 10 pengguna`;
  const users =
    bubble.avgActiveUsers === null
      ? ''
      : `, sekitar ${bubble.avgActiveUsers} orang aktif per pekan`;
  return `${bubble.city}: rata-rata PHQ-9 ${formatDecimalId(bubble.avgPhq9)}${users}`;
}

interface FaskesMapProps {
  model: MapModel;
  /** Teks pembaca layar untuk wadah peta. */
  label: string;
}

/**
 * Peta sebaran (Leaflet + OpenStreetMap). Gelembung kota berwarna menurut rata-rata PHQ-9 dan berukuran menurut
 * pengguna aktif; kota yang disembunyikan database digambar sebagai cincin putus-putus tanpa angka. Titik kecil
 * adalah faskes publik. Peta hanyalah tampilan tambahan: semua angka yang sama ada di tabel pada halaman.
 * Roda tetikus tidak memperbesar peta (agar gulir halaman tidak terhenti); tombol +/- dan keyboard bekerja.
 */
export function FaskesMap({ model, label }: FaskesMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;

    void import('leaflet').then((leaflet) => {
      const L = leaflet.default ?? leaflet;
      if (cancelled || !container.current) return;

      map = L.map(container.current, { scrollWheelZoom: false, worldCopyJump: false });
      L.tileLayer(TILE_URL, { maxZoom: 18, attribution: ATTRIBUTION }).addTo(map);

      const points: Array<[number, number]> = [];
      const ink = token('--biru-700', '#1d4668');

      for (const pin of model.pins) {
        points.push([pin.lat, pin.lng]);
        L.circleMarker([pin.lat, pin.lng], {
          radius: pin.isOwn ? 7 : 4,
          color: pin.isOwn ? token('--matahari-600', '#b85f00') : ink,
          weight: pin.isOwn ? 3 : 1,
          fillColor: pin.isOwn ? token('--matahari-500', '#e07b00') : ink,
          fillOpacity: pin.isOwn ? 0.9 : 0.6,
        })
          .bindTooltip(tooltipElement(`${pin.name}${pin.isOwn ? ' (faskesmu)' : ''}`))
          .addTo(map);
      }

      for (const bubble of model.bubbles) {
        if (!bubble.position) continue;
        const { lat, lng } = bubble.position;
        points.push([lat, lng]);
        const color = bubble.band ? token(BAND_TOKEN[bubble.band], '#2e6da4') : ink;
        L.circleMarker([lat, lng], {
          radius: bubble.hidden
            ? 16
            : 14 + Math.min(14, Math.sqrt(bubble.avgActiveUsers ?? 0) * 1.4),
          color,
          weight: bubble.isOwn ? 4 : 2,
          dashArray: bubble.hidden ? '4 4' : undefined,
          fillColor: color,
          fillOpacity: bubble.hidden ? 0 : 0.45,
        })
          .bindTooltip(tooltipElement(bubbleText(bubble)), { sticky: true })
          .addTo(map);
      }

      if (points.length > 0) map.fitBounds(points, { padding: [32, 32], maxZoom: 11 });
      else map.setView([-2.5, 118], 5);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [model]);

  return (
    <div
      ref={container}
      role="group"
      aria-label={label}
      className="z-0 h-[24rem] w-full overflow-hidden rounded-lg bg-sunken max-sm:h-[20rem]"
    />
  );
}
