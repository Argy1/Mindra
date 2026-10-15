// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSESSMENT_CATEGORIES } from '@/lib/domain/assessment/category';
import { INSTRUMENT_IDS } from '@/lib/domain/assessment/instruments';
import {
  FHIR_SYSTEM,
  INSTRUMENT_CODING,
  interpretationFor,
  observationBundle,
  observationFromAssessment,
  type AssessmentForFhir,
} from './observation';

const DART_PATH = path.resolve(
  import.meta.dirname,
  '../../../../lib/features/satusehat/data/fhir_mappers.dart',
);
const dart = existsSync(DART_PATH) ? readFileSync(DART_PATH, 'utf8') : null;

const ASSESSMENT: AssessmentForFhir = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'phq9',
  score: 17,
  category: 'severe',
  completedAt: '2026-10-13T00:48:00+07:00',
};
const ISSUED = '2026-10-13T03:00:00.000Z';

describe('observationFromAssessment', () => {
  it('Observation R4 lengkap untuk PHQ-9: kategori survey, kode LOINC, nilai bulat, interpretasi', () => {
    const observation = observationFromAssessment(ASSESSMENT, {
      patientRef: 'Patient/abc',
      issuedAt: ISSUED,
    });
    expect(observation).toEqual({
      resourceType: 'Observation',
      id: ASSESSMENT.id,
      identifier: [{ system: FHIR_SYSTEM.mindraObservationId, value: ASSESSMENT.id }],
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'survey',
              display: 'Survey',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '44261-6',
            display: 'Patient Health Questionnaire 9 item (PHQ-9) total score',
          },
        ],
        text: 'Patient Health Questionnaire 9 item (PHQ-9) total score',
      },
      subject: { reference: 'Patient/abc' },
      effectiveDateTime: '2026-10-12T17:48:00.000Z',
      issued: ISSUED,
      valueInteger: 17,
      interpretation: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: 'AA',
              display: 'Critically abnormal',
            },
          ],
          text: 'Berat',
        },
      ],
    });
  });

  it('mode create: TANPA id logis (server tujuan yang memberi id); identifier Mindra tetap ada', () => {
    const observation = observationFromAssessment(ASSESSMENT, {
      patientRef: 'Patient/abc',
      issuedAt: ISSUED,
      mode: 'create',
    });
    expect('id' in observation).toBe(false);
    expect(observation.identifier?.[0]?.value).toBe(ASSESSMENT.id);
  });

  it('dengan id organisasi SATUSEHAT: performer dan identifier organisasi ikut', () => {
    const observation = observationFromAssessment(ASSESSMENT, {
      patientRef: 'Patient/abc',
      issuedAt: ISSUED,
      mode: 'create',
      organizationId: 'org-123',
    });
    expect(observation.performer).toEqual([{ reference: 'Organization/org-123' }]);
    expect(observation.identifier).toContainEqual({
      system: 'http://sys-ids.kemkes.go.id/observation/org-123',
      value: ASSESSMENT.id,
    });
  });

  it('tidak memuat jawaban per butir maupun data pribadi: hanya skor total dan kategori', () => {
    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value !== null && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) {
          keys.add(key);
          walk(inner);
        }
      }
    };
    walk(observationFromAssessment(ASSESSMENT, { patientRef: 'Patient/abc', issuedAt: ISSUED }));
    for (const forbidden of [
      'answers',
      'answer',
      'name',
      'email',
      'phone',
      'nik',
      'birthDate',
      'address',
    ]) {
      expect(keys.has(forbidden), forbidden).toBe(false);
    }
  });

  it('waktu efektif dinormalkan ke UTC dari offset apa pun', () => {
    const a = observationFromAssessment(
      { ...ASSESSMENT, completedAt: '2026-10-13T00:48:00+07:00' },
      { patientRef: 'Patient/x', issuedAt: ISSUED },
    );
    const b = observationFromAssessment(
      { ...ASSESSMENT, completedAt: '2026-10-12T17:48:00Z' },
      { patientRef: 'Patient/x', issuedAt: ISSUED },
    );
    expect(a.effectiveDateTime).toBe(b.effectiveDateTime);
  });

  it('semua instrumen dan semua kategori menghasilkan Observation yang sah secara struktur', () => {
    for (const type of INSTRUMENT_IDS) {
      for (const category of ASSESSMENT_CATEGORIES) {
        const observation = observationFromAssessment(
          { ...ASSESSMENT, type, category },
          { patientRef: 'Patient/x', issuedAt: ISSUED },
        );
        expect(observation.code.coding[0]!.code).toBe(INSTRUMENT_CODING[type].code);
        expect(observation.interpretation[0]!.coding[0]!.code).toBe(
          interpretationFor(category).code,
        );
        expect(Number.isInteger(observation.valueInteger)).toBe(true);
      }
    }
  });
});

describe('INSTRUMENT_CODING', () => {
  it('PHQ-9, GAD-7, dan PSS-10 memakai LOINC; SRQ-20 memakai sistem lokal (jujur, bukan kode karangan)', () => {
    expect(INSTRUMENT_CODING.phq9).toMatchObject({ system: 'http://loinc.org', code: '44261-6' });
    expect(INSTRUMENT_CODING.gad7).toMatchObject({ system: 'http://loinc.org', code: '70274-6' });
    expect(INSTRUMENT_CODING.pss10).toEqual({
      system: 'http://loinc.org',
      code: '106860-0',
      display: 'Perceived stress scale-10 total score [PSS-10]',
    });
    expect(INSTRUMENT_CODING.srq20).toMatchObject({
      system: 'https://mindra.app/fhir/instrument',
      code: 'srq20-total',
    });
  });

  it('kode lokal lama PSS-10 (pss10-total) tidak dipakai lagi', () => {
    expect(JSON.stringify(INSTRUMENT_CODING)).not.toContain('pss10-total');
  });

  it('Observation PSS-10 membawa kode LOINC, dan SRQ-20 tetap kode lokal dengan code.text terisi', () => {
    const options = { patientRef: 'Patient/abc', issuedAt: ISSUED };
    const pss = observationFromAssessment({ ...ASSESSMENT, type: 'pss10', score: 21 }, options);
    expect(pss.code.coding).toEqual([
      {
        system: 'http://loinc.org',
        code: '106860-0',
        display: 'Perceived stress scale-10 total score [PSS-10]',
      },
    ]);
    expect(pss.code.text).toBe('Perceived stress scale-10 total score [PSS-10]');
    const srq = observationFromAssessment({ ...ASSESSMENT, type: 'srq20', score: 9 }, options);
    expect(srq.code.coding[0]).toMatchObject({
      system: 'https://mindra.app/fhir/instrument',
      code: 'srq20-total',
    });
    expect(srq.code.text).toBe('WHO Self-Reporting Questionnaire 20 (SRQ-20) total score');
  });

  it('setiap instrumen punya kode unik', () => {
    const codes = INSTRUMENT_IDS.map((id) => INSTRUMENT_CODING[id].code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('interpretationFor', () => {
  it('N untuk minimal, A untuk ringan dan sedang, AA untuk berat', () => {
    expect(ASSESSMENT_CATEGORIES.map((c) => interpretationFor(c).code)).toEqual([
      'N',
      'A',
      'A',
      'AA',
    ]);
  });
});

describe('observationBundle', () => {
  const options = {
    patientRef: 'Patient/abc',
    issuedAt: ISSUED,
    baseUrl: 'https://mindra.example/api/v1/fhir',
    selfUrl: 'https://mindra.example/api/v1/fhir/Observation?patient=me',
  };

  it('Bundle searchset: total, tautan self, entri dengan fullUrl dan search.mode', () => {
    const bundle = observationBundle(
      [ASSESSMENT, { ...ASSESSMENT, id: '22222222-2222-4222-8222-222222222222' }],
      options,
    );
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('searchset');
    expect(bundle.total).toBe(2);
    expect(bundle.link).toEqual([{ relation: 'self', url: options.selfUrl }]);
    expect(bundle.entry[0]).toMatchObject({
      fullUrl: `${options.baseUrl}/Observation/${ASSESSMENT.id}`,
      search: { mode: 'match' },
      resource: { resourceType: 'Observation', id: ASSESSMENT.id },
    });
  });

  it('tautan next hanya bila ada halaman berikutnya', () => {
    const next = observationBundle([ASSESSMENT], {
      ...options,
      nextUrl: `${options.selfUrl}&cursor=abc`,
    });
    expect(next.link.map((l) => l.relation)).toEqual(['self', 'next']);
    expect(observationBundle([], options).total).toBe(0);
  });
});

describe.skipIf(!dart)('kesepakatan dengan aplikasi Flutter (membaca fhir_mappers.dart)', () => {
  const source = dart ?? '';

  it('sistem URI sama', () => {
    expect(source).toContain(`_loincSystem = 'http://loinc.org'`);
    expect(source).toContain(
      `'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation'`,
    );
    expect(source).toContain(`'http://terminology.hl7.org/CodeSystem/observation-category'`);
    expect(source).toContain(`'https://mindra.app/fhir/instrument'`);
  });

  it('kode dan tampilan tiap instrumen sama dengan tabel Dart', () => {
    for (const id of INSTRUMENT_IDS) {
      const coding = INSTRUMENT_CODING[id];
      expect(source, `${id}: kode`).toContain(`code: '${coding.code}'`);
      expect(source, `${id}: tampilan`).toContain(coding.display);
    }
  });

  it('pemetaan interpretasi dan label sama dengan Dart', () => {
    expect(source).toMatch(/'minimal' => 'N'/);
    expect(source).toMatch(/'mild' => 'A'/);
    expect(source).toMatch(/'moderate' => 'A'/);
    expect(source).toMatch(/'severe' => 'AA'/);
    expect(source).toMatch(/'severe' => 'Critically abnormal'/);
    expect(source).toMatch(/'mild' \|\| 'moderate' => 'Abnormal'/);
    for (const label of ['Minimal', 'Ringan', 'Sedang', 'Berat']) {
      expect(source).toContain(`=> '${label}'`);
    }
  });

  it('bentuk Observation sama: status final, kategori survey, valueInteger, interpretation', () => {
    expect(source).toContain(`'status': 'final'`);
    expect(source).toContain(`'code': 'survey'`);
    expect(source).toContain(`'valueInteger': result.totalScore`);
    expect(source).toContain(`'subject': {'reference': 'Patient/$patientFhirId'}`);
  });
});
