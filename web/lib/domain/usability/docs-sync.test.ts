import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RESPONSE_COLUMNS, SUS_ITEMS, SUS_SCALE_LABELS } from './sus';
import { UEQ_S_ITEMS } from './ueq';

/**
 * Menjaga dokumen uji pengguna dan kuesioner Google Form tetap sama dengan kode: butir yang dibacakan atau
 * disalin ke formulir adalah butir yang dihitung oleh `pnpm usability:report`. Bila tes ini gagal, ubah dokumen
 * (bukan sekadar tesnya) dan jangan menerjemahkan ulang butir sendiri.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const DOCS = {
  'docs/UJI-PENGGUNA.md': read('../../../docs/UJI-PENGGUNA.md'),
  'docs/uji-pengguna/kuesioner-gabungan.md': read(
    '../../../docs/uji-pengguna/kuesioner-gabungan.md',
  ),
};

describe.each(Object.entries(DOCS))('%s', (_name, text) => {
  const lines = text.split(/\r?\n/);

  it.each(SUS_ITEMS.map((item, index) => [index + 1, item] as const))(
    'memuat butir SUS %i persis seperti di kode',
    (number, item) => {
      expect(lines.some((line) => line.includes(`| ${number} | ${item}`))).toBe(true);
    },
  );

  it('memuat label skala SUS 1 sampai 5', () => {
    for (const label of SUS_SCALE_LABELS) expect(text).toContain(label);
  });

  it.each(UEQ_S_ITEMS.map((item, index) => [index + 1, item] as const))(
    'memuat butir UEQ-S %i (kutub kiri dan kanan) persis seperti di kode',
    (number, item) => {
      expect(
        lines.some((line) => line.includes(`| ${number} | ${item.negative} | ${item.positive}`)),
      ).toBe(true);
    },
  );
});

describe('templat berkas respons', () => {
  it('judul kolom templat CSV sama dengan kolom yang dibaca kode', () => {
    const header = read('../../../docs/uji-pengguna/template-respons.csv').split(/\r?\n/)[0];
    expect(header).toBe(RESPONSE_COLUMNS.join(','));
  });

  it('dokumen kuesioner gabungan memuat judul kolom CSV yang sama', () => {
    expect(DOCS['docs/uji-pengguna/kuesioner-gabungan.md']).toContain(RESPONSE_COLUMNS.join(','));
  });
});
