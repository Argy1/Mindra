import { describe, expect, it } from 'vitest';
import { csvRecords } from '@/lib/utils/csv';
import { renderUsabilityReport } from './report';
import { parseResponses } from './sus';

/** Data SINTETIS untuk menguji laporan. Bukan hasil responden. */
const CSV = [
  'id,peran,t1,t2,t3,t4,t5,t6,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,buka1,buka2,buka3',
  'R01,pengguna,1,1,0,,,,5,1,5,1,5,1,5,1,5,1,"rapi, jelas",,',
  'R02,pengguna,1,0,,,,,3,3,3,3,3,3,3,3,3,3,,"bingung di | tabel",ubah warna',
  'R03,profesional,1,1,1,,,,4,2,4,1,5,2,4,2,5,1,,,',
  'R04,pengguna,,,,,,,9,1,5,1,5,1,5,1,5,1,,,',
].join('\n');

describe('renderUsabilityReport', () => {
  const report = renderUsabilityReport(parseResponses(csvRecords(CSV)));

  it('menyebut jumlah responden valid dan patokan 68', () => {
    expect(report).toContain('3 responden valid');
    expect(report).toContain('patokan rata-rata industri 68');
  });

  it('skor 100, 50, dan 85 → rata-rata 78,3 dan median 85; kelompok dipisah per peran', () => {
    expect(report).toContain('| Semua | 3 | 78,3 | 85 |');
    expect(report).toContain('| pengguna | 2 | 75 | 75 |');
    expect(report).toContain('| profesional | 1 | 85 | 85 |');
  });

  it('kategori penerimaan: satu marginal (50), dua dapat diterima', () => {
    expect(report).toContain('| Marginal (50 sampai 70) | 1 |');
    expect(report).toContain('| Dapat diterima (di atas 70) | 2 |');
    expect(report).toContain('| Tidak dapat diterima (di bawah 50) | 0 |');
  });

  it('penyelesaian tugas dihitung per peran dan hanya memuat tugas yang dikerjakan', () => {
    const [, afterPengguna = ''] = report.split('### pengguna');
    const [pengguna = '', profesional = ''] = afterPengguna.split('### profesional');
    expect(pengguna).toContain('| T1 | 2 | 2 | 100% |');
    expect(pengguna).toContain('| T2 | 2 | 1 | 50% |');
    expect(pengguna).toContain('| T3 | 1 | 0 | 0% |');
    expect(profesional).toContain('| T1 | 1 | 1 | 100% |');
    expect(profesional).toContain('| T3 | 1 | 1 | 100% |');
    expect(report).not.toContain('| T4 |');
  });

  it('butir diurutkan dari yang paling menurunkan skor (kehilangan terbesar di atas)', () => {
    // Butir 1 kehilangan 1,00; butir 4 hanya 0,67 (dihitung dari data di atas).
    const section = report.split('## Butir yang paling menurunkan skor')[1] ?? '';
    expect(section.indexOf('| 1 |')).toBeGreaterThan(-1);
    expect(section.indexOf('| 1 |')).toBeLessThan(section.indexOf('| 4 |'));
    expect(section).toContain('| 1,67 | 0,67 |');
  });

  it('jawaban terbuka yang kosong tidak dicantumkan', () => {
    // R03 mengosongkan ketiga jawaban terbuka.
    expect(report).not.toContain('- R03:');
  });

  it('jawaban terbuka tercantum per pertanyaan dengan id, dan | dilindungi agar tabel tidak pecah', () => {
    expect(report).toContain('- R01: rapi, jelas');
    expect(report).toContain('- R02: bingung di \\| tabel');
    expect(report).toContain('- R02: ubah warna');
  });

  it('baris cacat dilaporkan dan tidak ikut dihitung', () => {
    expect(report).toContain('## Baris yang ditolak');
    expect(report).toContain('- Baris 5: R04: setiap jawaban harus bilangan bulat 1 sampai 5');
  });

  it('tanpa responden valid: pesan jelas, tanpa angka karangan', () => {
    const empty = renderUsabilityReport(parseResponses([]));
    expect(empty).toContain('Belum ada respons yang valid.');
    expect(empty).not.toContain('Rata-rata');
  });

  it('memuat catatan metode (sampel kemudahan, n kecil)', () => {
    expect(report).toContain('Sampel kemudahan');
    expect(report).toContain('n kecil');
  });

  it('tanpa kolom UEQ-S: bagian UEQ-S menyatakan belum ada data, tanpa angka karangan', () => {
    expect(report).toContain('## Skor UEQ-S');
    expect(report).toContain('Belum ada data UEQ-S pada berkas ini');
    expect(report).not.toContain('Pragmatic quality');
  });
});

describe('renderUsabilityReport dengan UEQ-S', () => {
  /**
   * Data SINTETIS. Tiga responden dengan SUS sempurna; UEQ-S: R01 semua 7, R02 semua 4,
   * R03 [6,6,6,6,2,2,2,2], R04 mengosongkan UEQ-S. Angka UEQ dihitung tangan di ueq.test.ts.
   */
  const sus = '5,1,5,1,5,1,5,1,5,1';
  const CSV_UEQ = [
    'id,peran,t1,t2,t3,t4,t5,t6,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,ueq1,ueq2,ueq3,ueq4,ueq5,ueq6,ueq7,ueq8,buka1,buka2,buka3',
    `R01,pengguna,,,,,,,${sus},7,7,7,7,7,7,7,7,,,`,
    `R02,pengguna,,,,,,,${sus},4,4,4,4,4,4,4,4,,,`,
    `R03,pengguna,,,,,,,${sus},6,6,6,6,2,2,2,2,,,`,
    `R04,pengguna,,,,,,,${sus},,,,,,,,,,,`,
  ].join('\n');
  const report = renderUsabilityReport(parseResponses(csvRecords(CSV_UEQ)));

  it('judul menyebut SUS dan UEQ-S; semua responden valid dihitung di SUS (4), hanya pengisi di UEQ-S (3)', () => {
    expect(report).toContain('# Hasil uji pengguna (SUS dan UEQ-S)');
    expect(report).toContain('4 responden valid');
    expect(report).toContain('3 responden mengisi UEQ-S');
  });

  it('tiga skala dengan dua desimal, selang 95%, dan kategori benchmark', () => {
    expect(report).toContain(
      '| Pragmatic quality (butir 1-4) | 1,67 | 1,53 | -2,13 sampai 3,00 | Good |',
    );
    expect(report).toContain(
      '| Hedonic quality (butir 5-8) | 0,33 | 2,52 | -3,00 sampai 3,00 | Bad (25% terburuk) |',
    );
    expect(report).toContain(
      '| Overall (butir 1-8) | 1,00 | 1,73 | -3,00 sampai 3,00 | Below average |',
    );
  });

  it('rata-rata per butir memuat kedua kutub kata sifat', () => {
    expect(report).toContain('| 1 | menghalangi | mendukung | 1,67 |');
    expect(report).toContain('| 5 | membosankan | mengasyikkan | 0,33 |');
    expect(report).toContain('| 8 | lazim | terdepan | 0,33 |');
  });

  it('n di bawah 20 diberi catatan bahwa kategori benchmark hanya indikatif', () => {
    expect(report).toContain('n = 3, di bawah 20 responden');
    expect(report).toContain('hanya indikatif');
  });

  it('catatan metode menyebut sumber butir dan sifat benchmark UEQ-S', () => {
    expect(report).toContain('Sharfina dan Santoso, 2016');
    expect(report).toContain('Hinderks, Schrepp, dan Thomaschewski, 2018');
    expect(report).toContain('bukan satu responden');
  });

  it('rentang skor SUS memakai koma desimal seperti angka lain di laporan (92,5, bukan 92.5)', () => {
    // SUS [5,1,5,2,4,1,5,1,5,2]: ganjil (4+4+3+4+4) = 19, genap (4+3+4+4+3) = 18, 37 x 2,5 = 92,5.
    const csv = [
      'id,peran,t1,t2,t3,t4,t5,t6,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10',
      'R01,pengguna,,,,,,,5,1,5,2,4,1,5,1,5,2',
      'R02,pengguna,,,,,,,5,1,5,1,5,1,5,1,5,1',
    ].join('\n');
    const result = renderUsabilityReport(parseResponses(csvRecords(csv)));
    expect(result).toContain('92,5 sampai 100');
    expect(result).not.toContain('92.5');
  });

  it('UEQ-S terisi sebagian ditolak dan dilaporkan, tidak ikut dihitung', () => {
    const partial = [
      'id,peran,t1,t2,t3,t4,t5,t6,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,ueq1,ueq2,ueq3,ueq4,ueq5,ueq6,ueq7,ueq8,buka1,buka2,buka3',
      `R01,pengguna,,,,,,,${sus},7,7,,7,7,7,7,7,,,`,
    ].join('\n');
    const result = renderUsabilityReport(parseResponses(csvRecords(partial)));
    expect(result).toContain('Belum ada respons yang valid.');
    expect(result).toContain('- Baris 2: ueq3 kosong');
  });
});
