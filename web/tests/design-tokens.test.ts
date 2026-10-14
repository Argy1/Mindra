import { describe, expect, it } from 'vitest';
import { contrastRatio, readCssVariables, resolveVariable } from './helpers/css-tokens';

const web = readCssVariables('app/globals.css');
const design = readCssVariables('design/tokens.css');
const token = (name: string) => resolveVariable(web, name);

/** Token yang SENGAJA berbeda dari design/tokens.css (alasan di docs/DECISIONS.md). */
const INTENTIONAL_OVERRIDES = new Set(['--fg-4']);

describe('token web setia pada design/tokens.css', () => {
  const colorTokens = [...design.keys()].filter(
    (name) =>
      /^--(biru|sage|neutral|matahari|success|warning|danger|info|mood)-/.test(name) &&
      /^#[0-9a-f]{6}$/i.test(resolveVariable(design, name)),
  );

  it('menemukan token warna untuk dibandingkan', () => {
    expect(colorTokens.length).toBeGreaterThan(80);
  });

  it.each(colorTokens)('%s bernilai sama dengan desain', (name) => {
    expect(token(name)).toBe(resolveVariable(design, name));
  });

  it('hanya override yang terdokumentasi yang menyimpang dari desain', () => {
    const drifted = [
      '--fg-1',
      '--fg-2',
      '--fg-3',
      '--fg-4',
      '--surface-canvas',
      '--surface-raised',
      '--surface-sunken',
    ]
      .filter((name) => token(name) !== resolveVariable(design, name))
      .filter((name) => !INTENTIONAL_OVERRIDES.has(name));
    expect(drifted).toEqual([]);
  });
});

describe('kontras teks ≥ 4,5:1 (WCAG 1.4.3, syarat CLAUDE.md)', () => {
  const surfaces = ['--surface-canvas', '--surface-raised', '--surface-sunken'];

  it.each(
    ['--fg-1', '--fg-2', '--fg-3', '--fg-4'].flatMap((fg) =>
      surfaces.map((bg) => [fg, bg] as const),
    ),
  )('%s di atas %s', (fg, bg) => {
    expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('--fg-4 juga terbaca di atas biru-50 (item navigasi / chip aktif)', () => {
    expect(contrastRatio(token('--fg-4'), token('--biru-50'))).toBeGreaterThanOrEqual(4.5);
  });

  it('alasan override: --fg-4 asli (neutral-500) GAGAL di kanvas dan sunken', () => {
    expect(contrastRatio(token('--neutral-500'), token('--surface-canvas'))).toBeLessThan(4.5);
    expect(contrastRatio(token('--neutral-500'), token('--surface-sunken'))).toBeLessThan(4.5);
  });

  const pairs: Array<[string, string, string]> = [
    ['teks tombol primary', '#ffffff', '--biru-500'],
    ['teks tombol sage (sage-600)', '#ffffff', '--sage-600'],
    ['teks tombol krisis', '#ffffff', '--danger-500'],
    ['tautan di kanvas', '--biru-600', '--surface-canvas'],
    ['item navigasi aktif', '--biru-700', '--biru-50'],
    ['badge minimal', '--success-700', '--success-50'],
    ['badge ringan', '--info-700', '--info-50'],
    ['badge sedang', '--warning-700', '--warning-50'],
    ['badge berat', '--danger-700', '--danger-50'],
    ['badge sage', '--sage-700', '--sage-50'],
    ['banner krisis', '--danger-900', '--danger-50'],
    ['catatan kaki banner krisis', '--danger-700', '--danger-50'],
    ['teks galat di kanvas', '--danger-700', '--surface-canvas'],
    ['teks galat di kartu', '--danger-700', '--surface-raised'],
    ['avatar sage', '--sage-800', '--sage-100'],
    ['avatar biru', '--biru-800', '--biru-100'],
    ['avatar matahari', '--matahari-800', '--matahari-100'],
    ['pita krisis landing', '--danger-900', '--danger-50'],
  ];

  it.each(pairs)('%s', (_label, fg, bg) => {
    const fgColor = fg.startsWith('#') ? fg : token(fg);
    const bgColor = bg.startsWith('#') ? bg : token(bg);
    expect(contrastRatio(fgColor, bgColor)).toBeGreaterThanOrEqual(4.5);
  });

  it('alasan override: teks putih di sage-500 dari desain GAGAL, sage-600 lolos', () => {
    expect(contrastRatio('#ffffff', token('--sage-500'))).toBeLessThan(4.5);
    expect(contrastRatio('#ffffff', token('--sage-600'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('kontras non-teks ≥ 3:1 (WCAG 1.4.11)', () => {
  const surfaces = ['--surface-canvas', '--surface-raised'];

  it.each(surfaces)('batas kolom isian (--border-control) di atas %s', (bg) => {
    expect(contrastRatio(token('--border-control'), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it.each(surfaces)('saklar menyala (sage-600) di atas %s', (bg) => {
    expect(contrastRatio(token('--sage-600'), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it('knob putih terlihat di atas latar saklar mati', () => {
    expect(contrastRatio('#ffffff', token('--border-control'))).toBeGreaterThanOrEqual(3);
  });

  it.each(surfaces)('cincin fokus (biru-500) di atas %s', (bg) => {
    expect(contrastRatio(token('--biru-500'), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it('alasan override: border-soft dan border-strong dari desain GAGAL 3:1 untuk kolom isian', () => {
    expect(contrastRatio(token('--border-soft'), token('--surface-raised'))).toBeLessThan(3);
    expect(contrastRatio(token('--border-strong'), token('--surface-raised'))).toBeLessThan(3);
  });
});
