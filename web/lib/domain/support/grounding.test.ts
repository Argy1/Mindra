import { describe, expect, it } from 'vitest';
import { GROUNDING_STEPS, groundingProgress } from './grounding';

describe('GROUNDING_STEPS', () => {
  it('urutan 5-4-3-2-1 dengan lima indra berbeda', () => {
    expect(GROUNDING_STEPS.map((step) => step.count)).toEqual([5, 4, 3, 2, 1]);
    expect(GROUNDING_STEPS.map((step) => step.sense)).toEqual([
      'melihat',
      'menyentuh',
      'mendengar',
      'mencium',
      'merasakan',
    ]);
  });

  it('ajakan menyapa "kamu", tanpa tanda seru, tanpa emoji, tanpa meremehkan', () => {
    for (const step of GROUNDING_STEPS) {
      expect(step.prompt).toContain('kamu');
      expect(step.prompt).not.toMatch(/!|\p{Extended_Pictographic}/u);
      expect(step.prompt.toLowerCase()).not.toMatch(/tenang aja|pasti bisa|jangan sedih/);
    }
  });

  it('tidak ada ajakan yang memakai "Anda"', () => {
    for (const step of GROUNDING_STEPS) expect(step.prompt).not.toMatch(/\bAnda\b/i);
  });

  it('setiap ajakan menyebut jumlahnya', () => {
    for (const step of GROUNDING_STEPS) expect(step.prompt).toContain(String(step.count));
  });
});

describe('groundingProgress', () => {
  it('langkah pertama: label, tanpa tombol kembali, bukan terakhir', () => {
    const first = groundingProgress(0);
    expect(first).toMatchObject({
      index: 0,
      label: 'Langkah 1 dari 5',
      isFirst: true,
      isLast: false,
    });
    expect(first.step.count).toBe(5);
  });

  it('langkah terakhir', () => {
    const last = groundingProgress(4);
    expect(last).toMatchObject({
      index: 4,
      label: 'Langkah 5 dari 5',
      isFirst: false,
      isLast: true,
    });
    expect(last.step.count).toBe(1);
  });

  it('indeks di luar rentang, pecahan, dan NaN dipotong dengan aman', () => {
    expect(groundingProgress(-3).index).toBe(0);
    expect(groundingProgress(99).index).toBe(4);
    expect(groundingProgress(2.9).index).toBe(2);
    expect(groundingProgress(Number.NaN).index).toBe(0);
  });

  it('daftar langkah kosong ditolak', () => {
    expect(() => groundingProgress(0, [])).toThrow('Langkah grounding');
  });
});
