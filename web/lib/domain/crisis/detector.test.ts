// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTRUMENTS, type InstrumentId } from '@/lib/domain/assessment/instruments';
import { CRISIS_ITEM, CRISIS_KEYWORDS, detectAssessmentCrisis, detectCrisisText } from './detector';

const full = (id: InstrumentId, value: number) =>
  Object.fromEntries(INSTRUMENTS[id].questions.map((q) => [q.id, value]));

describe('deteksi krisis dari butir asesmen', () => {
  it('PHQ-9 butir 9 > 0 memicu krisis, berapa pun nilai positifnya', () => {
    for (const value of [1, 2, 3]) {
      expect(detectAssessmentCrisis('phq9', { ...full('phq9', 0), phq9_9: value })).toBe(true);
    }
  });

  it('PHQ-9 butir 9 = 0 tidak memicu krisis walau butir lain 3', () => {
    expect(detectAssessmentCrisis('phq9', { ...full('phq9', 3), phq9_9: 0 })).toBe(false);
  });

  it('SRQ-20 butir 17 = ya memicu krisis; = tidak, tidak', () => {
    expect(detectAssessmentCrisis('srq20', { ...full('srq20', 0), srq20_17: 1 })).toBe(true);
    expect(detectAssessmentCrisis('srq20', { ...full('srq20', 1), srq20_17: 0 })).toBe(false);
  });

  it('GAD-7 dan PSS-10 tidak punya butir krisis, jawaban maksimum pun tidak memicu', () => {
    expect(detectAssessmentCrisis('gad7', full('gad7', 3))).toBe(false);
    expect(detectAssessmentCrisis('pss10', full('pss10', 4))).toBe(false);
  });

  it('butir yang hilang dianggap 0, dan butir instrumen lain tidak ikut dihitung', () => {
    expect(detectAssessmentCrisis('phq9', {})).toBe(false);
    expect(detectAssessmentCrisis('phq9', { srq20_17: 1 })).toBe(false);
  });

  it('daftar butir krisis sama dengan yang dipakai trigger database', () => {
    expect(CRISIS_ITEM).toEqual({ phq9: 'phq9_9', srq20: 'srq20_17' });
  });
});

describe('deteksi krisis dari teks bebas', () => {
  it.each([
    'aku mau bunuh diri',
    'Rasanya pengen mati aja',
    'AKU SUDAH TIDAK KUAT LAGI',
    'kadang aku ingin menyakiti diri sendiri',
    'lebih baik kalau aku mati',
    'aku gak mau hidup lagi',
    'ada pikiran self-harm',
    'bunuh    diri',
    'dia cerita soal overdosis',
  ])('mendeteksi: "%s"', (text) => {
    expect(detectCrisisText(text)).toBe(true);
  });

  it.each([
    '',
    'hari ini capek tapi aku baik-baik saja',
    'lampu rumah mati semalaman',
    'aku suka makan nasi goreng',
    'kuliah hari ini berat sekali',
    'mati gaya nunggu antrean',
  ])('tidak mendeteksi: "%s"', (text) => {
    expect(detectCrisisText(text)).toBe(false);
  });

  it('semua kata kunci terdeteksi sendiri-sendiri, juga dalam huruf kapital', () => {
    for (const keyword of CRISIS_KEYWORDS) {
      expect(detectCrisisText(keyword), keyword).toBe(true);
      expect(detectCrisisText(keyword.toUpperCase()), keyword).toBe(true);
    }
  });
});

/** Bukti identik: daftar kata kunci web = daftar di berkas Dart (dilewati bila folder Flutter tidak ada). */
const DART_DETECTOR = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'lib',
  'features',
  'ai_companion',
  'data',
  'crisis_detector.dart',
);

describe.skipIf(!existsSync(DART_DETECTOR))('identik dengan crisis_detector.dart (Flutter)', () => {
  it('daftar kata kunci sama persis (isi dan urutan)', () => {
    const source = readFileSync(DART_DETECTOR, 'utf8');
    const list = source.match(/_keywords\s*=\s*<String>\[([\s\S]*?)\];/)?.[1] ?? '';
    const dart = [...list.matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
    expect(dart.length).toBeGreaterThan(40);
    expect([...CRISIS_KEYWORDS]).toEqual(dart);
  });
});
