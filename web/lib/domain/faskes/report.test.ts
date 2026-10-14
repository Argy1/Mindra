import { describe, expect, it } from 'vitest';
import type { AggregateRow } from './dashboard';
import {
  fileSlug,
  monthLabel,
  monthlyReport,
  monthOptions,
  REPORT_CSV_HEADER,
  reportToCsv,
} from './report';

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

describe('monthOptions', () => {
  it('bulan dari Senin pekan, tanpa duplikat, terbaru dulu', () => {
    expect(monthOptions(['2026-09-28', '2026-10-05', '2026-10-12', '2026-08-31'])).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
    ]);
  });
});

describe('monthlyReport', () => {
  const rows = [
    row({ city: 'Kota Bogor', weekStart: '2026-10-05', activeUsers: 20, avgPhq9: 6 }),
    row({
      city: 'Kota Bogor',
      weekStart: '2026-10-12',
      activeUsers: 30,
      avgPhq9: 8,
      crisisAlerts: 2,
    }),
    row({ city: 'Kota Bogor', weekStart: '2026-09-28', avgPhq9: 99 }),
    hidden('Kab. Cianjur', '2026-10-05'),
    row({ city: 'Kota Depok', weekStart: '2026-10-05' }),
  ];

  it('hanya pekan yang dimulai pada bulan itu; rata-rata tertimbang; hitungan dijumlah', () => {
    const report = monthlyReport(rows, '2026-10');
    const bogor = report.find((entry) => entry.city === 'Kota Bogor')!;
    expect(bogor).toMatchObject({
      weeksShown: 2,
      avgActiveUsers: 25,
      avgPhq9: 7.2, // (6*20 + 8*30) / 50
      minimal: 20,
      moderate: 6,
      crisisAlerts: 3,
      hidden: false,
    });
  });

  it('kota tersembunyi hanya baris penanda, tanpa angka, dan diletakkan terakhir', () => {
    const report = monthlyReport(rows, '2026-10');
    const cianjur = report.at(-1)!;
    expect(cianjur).toMatchObject({
      city: 'Kab. Cianjur',
      hidden: true,
      weeksShown: 0,
      avgPhq9: null,
      minimal: null,
      crisisAlerts: null,
    });
    expect(report.map((entry) => entry.city)).toEqual(['Kota Bogor', 'Kota Depok', 'Kab. Cianjur']);
  });

  it('bulan tanpa data atau format salah menghasilkan daftar kosong', () => {
    expect(monthlyReport(rows, '2026-07')).toEqual([]);
    for (const bad of ['', '2026-13', '2026-1', '26-10', '2026-10; drop', '2026-10-01']) {
      expect(monthlyReport(rows, bad), bad).toEqual([]);
    }
  });
});

describe('reportToCsv', () => {
  it('berisi header, BOM UTF-8, CRLF, dan baris kota tersembunyi tanpa angka', () => {
    const csv = reportToCsv(
      monthlyReport(
        [
          row({ city: 'Kota Bogor', weekStart: '2026-10-05' }),
          hidden('Kab. Cianjur', '2026-10-05'),
        ],
        '2026-10',
      ),
    );
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe(`﻿${REPORT_CSV_HEADER.join(',')}`);
    expect(lines[1]).toContain('Kota Bogor,Jawa Barat,tampil,1,20,7,6,15,10,5,3,2,1');
    expect(lines[2]).toBe(
      '2026-10,Kab. Cianjur,Jawa Barat,disembunyikan (kurang dari 10 pengguna),0,,,,,,,,,',
    );
  });

  it('nama kota dari isian pengguna tidak bisa menjadi rumus spreadsheet', () => {
    const evil = '=HYPERLINK("http://x.test","klik")';
    const csv = reportToCsv(
      monthlyReport([row({ city: evil, weekStart: '2026-10-05' })], '2026-10'),
    );
    expect(csv).toContain(`"'=HYPERLINK(""http://x.test"",""klik"")"`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });
});

describe('monthLabel dan fileSlug', () => {
  it('bulan ditulis dalam Bahasa Indonesia; nilai tak valid dikembalikan apa adanya', () => {
    expect(monthLabel('2026-10')).toBe('Oktober 2026');
    expect(monthLabel('2026-01')).toBe('Januari 2026');
    expect(monthLabel('2026-12')).toBe('Desember 2026');
    expect(monthLabel('x')).toBe('x');
  });

  it('nama berkas aman untuk header: tanpa kutip, garis miring, baris baru, atau karakter non-ASCII', () => {
    expect(fileSlug('Puskesmas Bogor Tengah')).toBe('puskesmas-bogor-tengah');
    // CR/LF, kutip, dan garis miring tidak boleh lolos ke header Content-Disposition.
    const hostile = `RS "Ibu & Anak"/${String.fromCharCode(13, 10)}X`;
    expect(fileSlug(hostile)).toBe('rs-ibu-anak-x');
    expect(fileSlug('日本語')).toBe('faskes');
    expect(fileSlug('')).toBe('faskes');
    expect(fileSlug('a'.repeat(100))).toHaveLength(40);
  });
});
