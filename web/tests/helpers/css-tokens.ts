import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

/** Ambil semua `--nama: nilai;` dari satu berkas CSS (hanya sampai awal blok @theme/@utility). */
export function readCssVariables(relativePath: string): Map<string, string> {
  const css = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const cutoff = withoutComments.search(/@theme|@utility/);
  const scope = cutoff === -1 ? withoutComments : withoutComments.slice(0, cutoff);

  const variables = new Map<string, string>();
  for (const match of scope.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    const [, name, value] = match;
    if (name && value) variables.set(name, value.trim());
  }
  return variables;
}

/** Selesaikan `var(--x)` berantai menjadi nilai akhir (heksadesimal). */
export function resolveVariable(variables: Map<string, string>, name: string): string {
  let value = variables.get(name);
  if (value === undefined) throw new Error(`Token ${name} tidak ditemukan`);

  for (let depth = 0; depth < 10; depth++) {
    const reference = value.match(/^var\((--[\w-]+)\)$/);
    if (!reference?.[1]) return value.toLowerCase();
    const next = variables.get(reference[1]);
    if (next === undefined) throw new Error(`Token ${reference[1]} (dari ${name}) tidak ditemukan`);
    value = next;
  }
  throw new Error(`Referensi melingkar di ${name}`);
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** Rasio kontras WCAG 2.x antara dua warna heksadesimal (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
