import type { AssessmentCategory } from '@/lib/domain/assessment/category';
import type { InstrumentId } from '@/lib/domain/assessment/instruments';

/**
 * Pemeta hasil skrining Mindra → FHIR R4 `Observation`. Port dari `FhirMappers.observationFromAssessment`
 * (../lib/features/satusehat/data/fhir_mappers.dart); sistem kode, kode, interpretasi, dan label
 * SAMA dengan aplikasi Flutter (dibuktikan tes yang membaca berkas Dart aslinya).
 *
 * Fungsi murni: tidak membaca jam (`issuedAt` diberikan pemanggil), tidak melakukan I/O.
 *
 * Kode LOINC (ketiganya diverifikasi 15 Okt 2026: status ACTIVE di LOINC 2.82, lewat server terminologi publik
 * tx.fhir.org karena loinc.org menolak akses otomatis; riset proposal memeriksanya di loinc.org):
 *   - PHQ-9 total score  = 44261-6   ("Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]")
 *   - GAD-7 total score  = 70274-6   ("Generalized anxiety disorder 7 item (GAD-7) total score [Reported.PHQ]")
 *   - PSS-10 total score = 106860-0  ("Perceived stress scale-10 total score [PSS-10]"), https://loinc.org/106860-0
 *   - SRQ-20 tidak punya kode LOINC total-skor: memakai sistem lokal Mindra, dan `Observation.code.text` selalu
 *     terisi. Ini DISENGAJA dan harus ditulis jujur di proposal.
 * Bundel belum divalidasi dengan validator HL7 resmi (docs/ARCHITECTURE.md §6).
 */

export const FHIR_SYSTEM = {
  loinc: 'http://loinc.org',
  interpretation: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
  observationCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
  mindraInstrument: 'https://mindra.app/fhir/instrument',
  /** Pengenal sumber daya milik Mindra (id hasil skrining) di server FHIR eksternal. */
  mindraObservationId: 'https://mindra.app/fhir/observation-id',
  /** SATUSEHAT: pengenal organisasi pembuat Observation (`{orgId}` diganti id organisasi). */
  satusehatObservationPrefix: 'http://sys-ids.kemkes.go.id/observation/',
} as const;

export interface InstrumentCoding {
  system: string;
  code: string;
  display: string;
}

export const INSTRUMENT_CODING: Readonly<Record<InstrumentId, InstrumentCoding>> = {
  phq9: {
    system: FHIR_SYSTEM.loinc,
    code: '44261-6',
    display: 'Patient Health Questionnaire 9 item (PHQ-9) total score',
  },
  gad7: {
    system: FHIR_SYSTEM.loinc,
    code: '70274-6',
    display: 'Generalized anxiety disorder 7 item (GAD-7) total score',
  },
  pss10: {
    system: FHIR_SYSTEM.loinc,
    code: '106860-0',
    display: 'Perceived stress scale-10 total score [PSS-10]',
  },
  srq20: {
    system: FHIR_SYSTEM.mindraInstrument,
    code: 'srq20-total',
    display: 'WHO Self-Reporting Questionnaire 20 (SRQ-20) total score',
  },
};

/** v3-ObservationInterpretation: minimal = N, ringan/sedang = A, berat = AA (sama dengan Flutter). */
const INTERPRETATION: Readonly<Record<AssessmentCategory, { code: string; display: string }>> = {
  minimal: { code: 'N', display: 'Normal' },
  mild: { code: 'A', display: 'Abnormal' },
  moderate: { code: 'A', display: 'Abnormal' },
  severe: { code: 'AA', display: 'Critically abnormal' },
};

const CATEGORY_TEXT_ID: Readonly<Record<AssessmentCategory, string>> = {
  minimal: 'Minimal',
  mild: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

export interface AssessmentForFhir {
  /** Id hasil skrining di Mindra. */
  id: string;
  type: InstrumentId;
  score: number;
  category: AssessmentCategory;
  /** ISO. */
  completedAt: string;
}

export interface ObservationOptions {
  /** Referensi pasien, mis. `Patient/abc`. */
  patientRef: string;
  /** Waktu `issued` (ISO UTC). Diberikan pemanggil supaya fungsi tetap murni. */
  issuedAt: string;
  /**
   * `export` (default): memuat `id` logis (id hasil) dan `identifier` Mindra, untuk Bundle hasil pencarian.
   * `create`: TANPA `id` (server tujuan yang memberi id), untuk dikirim lewat POST.
   */
  mode?: 'export' | 'create';
  /** Id organisasi SATUSEHAT; bila ada, `performer` dan `identifier` SATUSEHAT ikut disertakan. */
  organizationId?: string;
}

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  identifier?: Array<{ system: string; value: string }>;
  status: 'final';
  category: Array<{ coding: FhirCoding[] }>;
  code: { coding: FhirCoding[]; text: string };
  subject: { reference: string };
  performer?: Array<{ reference: string }>;
  effectiveDateTime: string;
  issued: string;
  valueInteger: number;
  interpretation: Array<{ coding: FhirCoding[]; text: string }>;
}

export function interpretationFor(category: AssessmentCategory) {
  return INTERPRETATION[category];
}

export function observationFromAssessment(
  assessment: AssessmentForFhir,
  options: ObservationOptions,
): FhirObservation {
  const coding = INSTRUMENT_CODING[assessment.type];
  const interpretation = INTERPRETATION[assessment.category];
  const identifiers: Array<{ system: string; value: string }> = [
    { system: FHIR_SYSTEM.mindraObservationId, value: assessment.id },
  ];
  if (options.organizationId) {
    identifiers.push({
      system: `${FHIR_SYSTEM.satusehatObservationPrefix}${options.organizationId}`,
      value: assessment.id,
    });
  }

  return {
    resourceType: 'Observation',
    ...(options.mode === 'create' ? {} : { id: assessment.id }),
    identifier: identifiers,
    status: 'final',
    category: [
      {
        coding: [{ system: FHIR_SYSTEM.observationCategory, code: 'survey', display: 'Survey' }],
      },
    ],
    code: {
      coding: [{ system: coding.system, code: coding.code, display: coding.display }],
      text: coding.display,
    },
    subject: { reference: options.patientRef },
    ...(options.organizationId
      ? { performer: [{ reference: `Organization/${options.organizationId}` }] }
      : {}),
    effectiveDateTime: new Date(assessment.completedAt).toISOString(),
    issued: options.issuedAt,
    valueInteger: assessment.score,
    interpretation: [
      {
        coding: [
          {
            system: FHIR_SYSTEM.interpretation,
            code: interpretation.code,
            display: interpretation.display,
          },
        ],
        text: CATEGORY_TEXT_ID[assessment.category],
      },
    ],
  };
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'searchset';
  total: number;
  link: Array<{ relation: string; url: string }>;
  entry: Array<{ fullUrl: string; resource: FhirObservation; search: { mode: 'match' } }>;
}

/** Bundle `searchset` dari beberapa hasil skrining. `baseUrl` tanpa garis miring di ujung. */
export function observationBundle(
  assessments: readonly AssessmentForFhir[],
  options: Omit<ObservationOptions, 'mode'> & {
    baseUrl: string;
    selfUrl: string;
    nextUrl?: string;
  },
): FhirBundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: assessments.length,
    link: [
      { relation: 'self', url: options.selfUrl },
      ...(options.nextUrl ? [{ relation: 'next', url: options.nextUrl }] : []),
    ],
    entry: assessments.map((assessment) => ({
      fullUrl: `${options.baseUrl}/Observation/${assessment.id}`,
      resource: observationFromAssessment(assessment, { ...options, mode: 'export' }),
      search: { mode: 'match' as const },
    })),
  };
}
