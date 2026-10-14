/**
 * Rekap uji pengguna: baca berkas respons CSV, hitung skor SUS dan penyelesaian tugas, tulis laporan Markdown.
 *
 *   pnpm usability:report docs/uji-pengguna/respons.csv
 *   pnpm usability:report docs/uji-pengguna/respons.csv --out docs/uji-pengguna/hasil.md
 *
 * Kolom berkas: lihat docs/uji-pengguna/template-respons.csv. Tanpa --out, laporan dicetak ke layar.
 * Berkas respons berisi jawaban orang sungguhan: JANGAN dimasukkan ke repo publik bila memuat apa pun
 * yang bisa dikenali. Gunakan id anonim (R01, R02, ...).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderUsabilityReport } from '../lib/domain/usability/report';
import { parseResponses, RESPONSE_COLUMNS } from '../lib/domain/usability/sus';
import { csvRecords, parseCsv } from '../lib/utils/csv';

const [input, flag, output] = process.argv.slice(2);
if (!input || (flag !== undefined && flag !== '--out') || (flag === '--out' && !output)) {
  console.error('Pemakaian: pnpm usability:report <respons.csv> [--out <hasil.md>]');
  process.exit(2);
}

const text = readFileSync(resolve(input), 'utf8');
const header = (parseCsv(text)[0] ?? []).map((name) => name.trim());
const missing = RESPONSE_COLUMNS.filter(
  (name) => !header.includes(name) && !name.startsWith('buka'),
);
if (missing.length > 0) {
  console.error(`Kolom wajib tidak ada di ${input}: ${missing.join(', ')}`);
  process.exit(2);
}

const report = renderUsabilityReport(parseResponses(csvRecords(text)));
if (output) {
  const target = resolve(output);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, report);
  console.log(`Laporan ditulis ke ${output}`);
} else {
  console.log(report);
}
