import { describe, expect, it } from 'vitest';
import { ASSESSMENT_CATEGORIES, CATEGORY_LABEL, isAssessmentCategory } from './category';

describe('kategori skrining', () => {
  it('sama dengan keluaran SQL classify_assessment', () => {
    expect([...ASSESSMENT_CATEGORIES]).toEqual(['minimal', 'mild', 'moderate', 'severe']);
  });

  it('setiap kategori punya label Bahasa Indonesia tanpa istilah klinis', () => {
    expect(CATEGORY_LABEL).toEqual({
      minimal: 'Minimal',
      mild: 'Ringan',
      moderate: 'Sedang',
      severe: 'Berat',
    });
    for (const label of Object.values(CATEGORY_LABEL)) {
      expect(label).not.toMatch(/gangguan|diagnosa|pasien/i);
    }
  });

  it('isAssessmentCategory menolak nilai di luar daftar', () => {
    expect(isAssessmentCategory('mild')).toBe(true);
    expect(isAssessmentCategory('moderately_severe')).toBe(false);
    expect(isAssessmentCategory(undefined)).toBe(false);
    expect(isAssessmentCategory(3)).toBe(false);
  });
});
