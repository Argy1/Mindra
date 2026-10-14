import { describe, expect, it } from 'vitest';
import {
  INSTRUMENT_IDS,
  INSTRUMENTS,
  type InstrumentId,
} from '@/lib/domain/assessment/instruments';
import { prepareAssessment } from './prepare';

const full = (id: InstrumentId, valueFor: (index: number) => number) =>
  Object.fromEntries(INSTRUMENTS[id].questions.map((q, i) => [q.id, valueFor(i)]));

describe('prepareAssessment', () => {
  it('menghitung skor dan kategori dari jawaban, dengan urutan butir sesuai instrumen', () => {
    const result = prepareAssessment({ type: 'phq9', answers: full('phq9', () => 3) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.total_score).toBe(27);
    expect(result.row.category).toBe('severe');
    expect(result.row.answers.map((a) => a.question_id)).toEqual(
      INSTRUMENTS.phq9.questions.map((q) => q.id),
    );
  });

  it('menyimpan jawaban MENTAH tetapi skor klinis membalik butir PSS-10 (perilaku Flutter)', () => {
    const result = prepareAssessment({ type: 'pss10', answers: full('pss10', () => 4) });
    if (!result.ok) throw new Error('seharusnya valid');
    expect(result.row.answers.every((a) => a.score === 4)).toBe(true);
    expect(result.row.total_score).toBe(24);
    expect(result.row.category).toBe('moderate');
  });

  it('urutan kunci di klien tidak memengaruhi hasil', () => {
    const reversedKeys = Object.fromEntries(Object.entries(full('gad7', () => 1)).reverse());
    const result = prepareAssessment({ type: 'gad7', answers: reversedKeys });
    if (!result.ok) throw new Error('seharusnya valid');
    expect(result.row.answers[0]!.question_id).toBe('gad7_1');
    expect(result.row.total_score).toBe(7);
  });

  it.each(INSTRUMENT_IDS)('%s: skor/kategori kiriman klien diabaikan, bukan dipercaya', (id) => {
    const result = prepareAssessment({
      type: id,
      answers: full(id, () => 0),
      total_score: 99,
      category: 'severe',
    });
    // Kunci tambahan di tingkat atas = permintaan tidak sah, bukan nilai yang diam-diam dipakai.
    expect(result.ok).toBe(false);
  });

  it('skor di dalam answers (kunci asing) ditolak', () => {
    const result = prepareAssessment({
      type: 'phq9',
      answers: { ...full('phq9', () => 0), total_score: 27 },
    });
    expect(result.ok).toBe(false);
  });

  it('jawaban belum lengkap → pesan yang menyuruh melengkapi', () => {
    const answers = full('phq9', () => 1);
    delete answers.phq9_9;
    const result = prepareAssessment({ type: 'phq9', answers });
    expect(result).toEqual({
      ok: false,
      message: 'Masih ada pertanyaan yang belum dijawab. Kembali dan lengkapi dulu.',
    });
  });

  it('nilai di luar rentang → ditolak', () => {
    const result = prepareAssessment({
      type: 'srq20',
      answers: { ...full('srq20', () => 0), srq20_3: 2 },
    });
    expect(result.ok).toBe(false);
  });

  it.each([
    null,
    undefined,
    'phq9',
    42,
    [],
    {},
    { type: 'dass21', answers: {} },
    { type: 'phq9' },
    { type: 'phq9', answers: [] },
    { type: 'phq9', answers: null },
    { type: 'phq9', answers: 'x' },
  ])('permintaan rusak ditolak dengan pesan umum: %j', (input) => {
    const result = prepareAssessment(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toMatch(/zod|undefined|type/i);
  });

  it('pesan galat ramah, tanpa tanda seru', () => {
    const result = prepareAssessment({ type: 'phq9', answers: {} });
    if (result.ok) throw new Error('seharusnya gagal');
    expect(result.message).not.toContain('!');
  });
});
