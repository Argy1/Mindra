import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENERGY_LABELS,
  MOOD_LABEL,
  MOOD_SCORE,
  MOOD_TRIGGERS,
  MOOD_TYPES,
  SLEEP_QUALITY_LABELS,
  isMoodType,
  moodGlyphSrc,
} from './mood';

describe('jenis perasaan', () => {
  it('tujuh jenis, urutan sama dengan desain beranda', () => {
    expect([...MOOD_TYPES]).toEqual([
      'tenang',
      'syukur',
      'bahagia',
      'hangat',
      'lelah',
      'sedih',
      'cemas',
    ]);
  });

  it('setiap jenis punya label, skor 1–5, dan ilustrasi yang benar-benar ada di public/assets/mood', () => {
    const assetDir = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      '..',
      'public',
      'assets',
      'mood',
    );
    const files = existsSync(assetDir) ? readdirSync(assetDir) : [];
    for (const mood of MOOD_TYPES) {
      expect(MOOD_LABEL[mood].length).toBeGreaterThan(2);
      expect(MOOD_SCORE[mood]).toBeGreaterThanOrEqual(1);
      expect(MOOD_SCORE[mood]).toBeLessThanOrEqual(5);
      expect(moodGlyphSrc(mood)).toBe(`/assets/mood/${mood}.svg`);
      expect(files).toContain(`${mood}.svg`);
    }
  });

  it('isMoodType menolak nilai asing', () => {
    expect(isMoodType('tenang')).toBe(true);
    for (const bad of ['Tenang', 'marah', '', null, undefined, 3])
      expect(isMoodType(bad)).toBe(false);
  });
});

describe('pemicu dan skala', () => {
  it('sepuluh pemicu, sama dengan aplikasi Flutter', () => {
    expect(MOOD_TRIGGERS).toHaveLength(10);
    expect(new Set(MOOD_TRIGGERS).size).toBe(10);
    expect(MOOD_TRIGGERS).toContain('Aktivitas Fisik');
  });

  it('skala energi dan kualitas tidur 1–5 lengkap, tanpa tanda seru', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(ENERGY_LABELS[level]).toBeTruthy();
      expect(SLEEP_QUALITY_LABELS[level]).toBeTruthy();
      expect(SLEEP_QUALITY_LABELS[level]).not.toContain('!');
    }
  });
});
