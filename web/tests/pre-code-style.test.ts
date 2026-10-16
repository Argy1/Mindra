import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

/** Isi satu aturan CSS bersarang `selector { ... }`, tanpa kurung kurawal. */
function ruleBody(selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

describe('code di dalam <pre> (temuan #11)', () => {
  it('code sebaris punya latar terang dan padding', () => {
    const inline = ruleBody('  code');
    expect(inline).toContain('background: var(--neutral-100)');
    expect(inline).toContain('padding: 2px 6px');
  });

  it('pre code menghapus latar dan padding supaya blok gelap tidak tampak terseleksi per baris', () => {
    const block = ruleBody('  pre code');
    expect(block).not.toBeNull();
    expect(block).toMatch(/background:\s*transparent/);
    expect(block).toMatch(/padding:\s*0/);
    expect(block).toMatch(/color:\s*inherit/);
  });

  it('aturan pre code berada SETELAH aturan code sebaris (kalau tidak, kalah urutan)', () => {
    expect(css.indexOf('  pre code {')).toBeGreaterThan(css.indexOf('  code {'));
  });
});
