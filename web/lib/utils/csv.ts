/**
 * Sel CSV aman: diawali apostrof bila dibaca spreadsheet sebagai rumus (= + - @, tab, CR) dan dikutip
 * bila memuat koma, tanda kutip, atau baris baru. Banyak nilai berasal dari kolom yang bisa diisi pengguna
 * lain (mis. nama kota di profil), jadi TIDAK boleh dipercaya (injeksi rumus/CSV injection).
 */
export function csvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[",\n\r]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/** UTF-8 dengan BOM supaya Excel membaca huruf Indonesia dengan benar; baris dipisah CRLF. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * Pembaca CSV (RFC 4180): kutip ganda, kutip yang digandakan, dan baris baru di dalam kutipan. BOM dibuang.
 * Pemisah dideteksi dari baris judul: Excel berlokal Indonesia menyimpan CSV dengan titik koma, bukan koma.
 * Baris yang seluruhnya kosong dilewati.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes(',') ? ',' : firstLine.includes(';') ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) endCell();
    else if (char === '\n') endRow();
    else if (char === '\r') {
      if (source[i + 1] === '\n') i += 1;
      endRow();
    } else cell += char;
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

/** Baris pertama jadi nama kolom; sel yang kurang dianggap kosong. */
export function csvRecords(text: string): Record<string, string>[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const names = header.map((name) => name.trim());
  return body.map((row) =>
    Object.fromEntries(names.map((name, index) => [name, row[index] ?? ''])),
  );
}
