// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_IDS, INSTRUMENT_LIST, INSTRUMENTS, isInstrumentId } from './instruments';

const EXPECTED_COUNTS = { phq9: 9, gad7: 7, pss10: 10, srq20: 20 } as const;

describe('katalog instrumen', () => {
  it('memuat empat instrumen dengan jumlah butir yang benar', () => {
    expect(INSTRUMENT_IDS).toEqual(['phq9', 'gad7', 'pss10', 'srq20']);
    for (const id of INSTRUMENT_IDS) {
      expect(INSTRUMENTS[id].questions).toHaveLength(EXPECTED_COUNTS[id]);
    }
    expect(INSTRUMENT_LIST.map((instrument) => instrument.id)).toEqual([...INSTRUMENT_IDS]);
  });

  it('id butir berurutan "<instrumen>_<nomor>" dan nomor urut mulai 1', () => {
    for (const id of INSTRUMENT_IDS) {
      INSTRUMENTS[id].questions.forEach((question, index) => {
        expect(question.id).toBe(`${id}_${index + 1}`);
        expect(question.order).toBe(index + 1);
        expect(question.instrumentId).toBe(id);
      });
    }
  });

  it('teks butir tidak kosong dan tidak ada duplikat dalam satu instrumen', () => {
    for (const id of INSTRUMENT_IDS) {
      const texts = INSTRUMENTS[id].questions.map((question) => question.text);
      expect(texts.every((text) => text.trim().length > 10)).toBe(true);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('skala jawaban: PHQ-9 dan GAD-7 0–3, PSS-10 0–4, SRQ-20 ya/tidak 0–1', () => {
    expect(INSTRUMENTS.phq9.questions[0]!.options.map((o) => o.value)).toEqual([0, 1, 2, 3]);
    expect(INSTRUMENTS.gad7.questions[0]!.options.map((o) => o.value)).toEqual([0, 1, 2, 3]);
    expect(INSTRUMENTS.pss10.questions[0]!.options.map((o) => o.value)).toEqual([0, 1, 2, 3, 4]);
    expect(INSTRUMENTS.srq20.questions[0]!.options).toEqual([
      { label: 'Tidak', value: 0 },
      { label: 'Ya', value: 1 },
    ]);
  });

  it('butir krisis ada di tempat yang dipakai trigger database: PHQ-9 butir 9 dan SRQ-20 butir 17', () => {
    expect(INSTRUMENTS.phq9.questions[8]!.text).toMatch(/lebih baik mati/);
    expect(INSTRUMENTS.srq20.questions[16]!.text).toMatch(/mengakhiri hidup/);
  });

  it('isInstrumentId menolak nilai asing', () => {
    expect(isInstrumentId('phq9')).toBe(true);
    for (const bad of ['PHQ9', 'phq-9', '', 'dass21', null, undefined, 9]) {
      expect(isInstrumentId(bad)).toBe(false);
    }
  });
});

/**
 * Bukti identik dengan aplikasi Flutter: baca langsung berkas Dart-nya dan bandingkan id, teks, skala,
 * dan butir terbalik untuk SETIAP pertanyaan. Dilewati bila folder induk (aplikasi Flutter) tidak ada,
 * mis. saat repo web di-clone sendirian.
 */
const DART_MODEL = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'lib',
  'features',
  'assessment',
  'data',
  'assessment_model.dart',
);

describe.skipIf(!existsSync(DART_MODEL))('identik dengan assessment_model.dart (Flutter)', () => {
  const source = readFileSync(DART_MODEL, 'utf8');

  const PRESET_VALUES: Record<string, number[]> = {
    _phqOptions: [0, 1, 2, 3],
    _pssOptions: [0, 1, 2, 3, 4],
    _yaTidakOptions: [0, 1],
  };

  interface DartQuestion {
    id: string;
    text: string;
    preset: string;
    reverse: boolean;
  }

  function parseDartQuestions(): DartQuestion[] {
    const found: DartQuestion[] = [];
    const block =
      /Question\(\s*id:\s*'([a-z0-9_]+)',\s*assessmentId:\s*'[a-z0-9]+',\s*order:\s*\d+,\s*text:\s*'((?:[^'\\]|\\.)*)',\s*options:\s*(\w+),\s*(isReverseScored:\s*true,)?\s*\)/g;
    for (const match of source.matchAll(block)) {
      found.push({
        id: match[1]!,
        text: match[2]!.replace(/\\'/g, "'"),
        preset: match[3]!,
        reverse: match[4] !== undefined,
      });
    }
    return found;
  }

  const dartQuestions = parseDartQuestions();

  it('berhasil membaca 46 pertanyaan dari berkas Dart (9 + 7 + 10 + 20)', () => {
    expect(dartQuestions).toHaveLength(46);
  });

  it('id, teks, skala jawaban, dan butir terbalik sama untuk semua pertanyaan', () => {
    const web = INSTRUMENT_IDS.flatMap((id) => INSTRUMENTS[id].questions);
    expect(web.map((q) => q.id)).toEqual(dartQuestions.map((q) => q.id));
    web.forEach((question, index) => {
      const dart = dartQuestions[index]!;
      expect(question.text, question.id).toBe(dart.text);
      expect(
        question.options.map((o) => o.value),
        question.id,
      ).toEqual(PRESET_VALUES[dart.preset]);
      expect(question.reverseScored, question.id).toBe(dart.reverse);
    });
  });

  it('label opsi sama dengan preset Dart', () => {
    const labelsOf = (preset: string) =>
      [
        ...(source.match(new RegExp(`const ${preset} = \\[([\\s\\S]*?)\\];`))?.[1] ?? '').matchAll(
          /label:\s*'([^']+)'/g,
        ),
      ].map((m) => m[1]);
    expect(INSTRUMENTS.phq9.questions[0]!.options.map((o) => o.label)).toEqual(
      labelsOf('_phqOptions'),
    );
    expect(INSTRUMENTS.pss10.questions[0]!.options.map((o) => o.label)).toEqual(
      labelsOf('_pssOptions'),
    );
    expect(INSTRUMENTS.srq20.questions[0]!.options.map((o) => o.label)).toEqual(
      labelsOf('_yaTidakOptions'),
    );
  });
});
