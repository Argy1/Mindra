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
});
