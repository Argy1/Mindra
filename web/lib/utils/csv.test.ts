import { describe, expect, it } from 'vitest';
import { csvCell, csvRecords, parseCsv, toCsv } from './csv';

describe('csvCell', () => {
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])(
    'awalan rumus %j diberi apostrof',
    (value) => {
      expect(csvCell(value).replace(/^"/, '')).toMatch(/^'/);
    },
  );

  it('mengutip koma, kutip, dan baris baru; kutip digandakan', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it('teks biasa dibiarkan, termasuk huruf Indonesia', () => {
    expect(csvCell('Kota Yogyakarta')).toBe('Kota Yogyakarta');
    expect(csvCell('')).toBe('');
  });
});

describe('toCsv', () => {
  it('BOM, CRLF di setiap baris termasuk yang terakhir', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('﻿a,b\r\n1,2\r\n');
  });
});

describe('parseCsv', () => {
  it('membaca baris CRLF, LF, dan CR; baris kosong dan BOM dilewati', () => {
    expect(parseCsv('﻿a,b\r\n1,2\n\n3,4\r5,6')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ]);
  });

  it('kutip ganda: koma, kutip yang digandakan, dan baris baru di dalam sel', () => {
    expect(parseCsv('a,b\n"x, y","dia bilang ""halo"""\n"baris\nbaru",z\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'dia bilang "halo"'],
      ['baris\nbaru', 'z'],
    ]);
  });

  it('mendeteksi titik koma (Excel berlokal Indonesia) dari baris judul', () => {
    expect(parseCsv('id;q1\nR01;4\n')).toEqual([
      ['id', 'q1'],
      ['R01', '4'],
    ]);
    // Koma di dalam sel pada berkas titik koma tidak memecah sel.
    expect(parseCsv('id;buka1\nR01;"ya, bagus"\n')[1]).toEqual(['R01', 'ya, bagus']);
  });

  it('sel terakhir tanpa baris baru di ujung tetap terbaca; sel kosong dipertahankan', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('bisa membaca kembali apa yang ditulis toCsv, termasuk apostrof pelindung rumus', () => {
    const rows = [
      ['Kota Bogor', 'a,b'],
      ['=1+1', 'dia "ok"'],
    ];
    const parsed = parseCsv(toCsv(['kota', 'catatan'], rows));
    expect(parsed).toEqual([
      ['kota', 'catatan'],
      ['Kota Bogor', 'a,b'],
      ["'=1+1", 'dia "ok"'],
    ]);
  });
});

describe('csvRecords', () => {
  it('baris pertama jadi nama kolom; sel yang kurang dianggap kosong; berkas kosong menghasilkan daftar kosong', () => {
    expect(csvRecords('id, q1\nR01,4\nR02\n')).toEqual([
      { id: 'R01', q1: '4' },
      { id: 'R02', q1: '' },
    ]);
    expect(csvRecords('')).toEqual([]);
  });
});
