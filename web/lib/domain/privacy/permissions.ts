import { z } from 'zod';

/**
 * Izin berbagi data. Kunci dan nilai bawaan SAMA dengan database dan aplikasi Flutter:
 *   - psikolog   → `care_links.permissions` (dibaca `can_view()`)
 *   - pendamping → `caregiver_relationships.permissions` (kunci milik aplikasi Flutter)
 */

export const PSYCHOLOGIST_PERMISSION_KEYS = [
  'assessments',
  'mood',
  'sleep',
  'crisis_alerts',
  'ai_summary',
] as const;
export type PsychologistPermissionKey = (typeof PSYCHOLOGIST_PERMISSION_KEYS)[number];

export const CAREGIVER_PERMISSION_KEYS = [
  'mood_daily',
  'assessment_results',
  'app_activity',
  'emergency_alerts',
] as const;
export type CaregiverPermissionKey = (typeof CAREGIVER_PERMISSION_KEYS)[number];

export type PermissionKind = 'psychologist' | 'caregiver';

export const PERMISSION_KEYS = {
  psychologist: PSYCHOLOGIST_PERMISSION_KEYS,
  caregiver: CAREGIVER_PERMISSION_KEYS,
} as const;

/** Label yang dilihat pengguna (design/app-privasi.html). */
export const PERMISSION_LABEL: Readonly<Record<string, string>> = {
  assessments: 'Hasil skrining',
  mood: 'Mood harian',
  sleep: 'Catatan tidur',
  crisis_alerts: 'Peringatan krisis',
  ai_summary: 'Ringkasan teman cerita',
  mood_daily: 'Mood harian',
  assessment_results: 'Hasil skrining',
  app_activity: 'Aktivitas aplikasi',
  emergency_alerts: 'Peringatan darurat',
};

export type PsychologistPermissions = Record<PsychologistPermissionKey, boolean>;
export type CaregiverPermissions = Record<CaregiverPermissionKey, boolean>;

/** Izin awal saat pasien menghubungkan psikolog (ringkasan teman cerita sengaja mati). */
export const DEFAULT_PSYCHOLOGIST_PERMISSIONS: PsychologistPermissions = {
  assessments: true,
  mood: true,
  sleep: true,
  crisis_alerts: true,
  ai_summary: false,
};

/** Izin awal undangan pendamping, sama dengan aplikasi Flutter. */
export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverPermissions = {
  mood_daily: true,
  assessment_results: false,
  app_activity: false,
  emergency_alerts: true,
};

/**
 * Membaca izin dari JSON database. Sengaja meniru SQL (`permissions ->> kunci = 'true'`): hanya
 * boolean `true` atau teks "true" yang berarti diizinkan; kunci hilang, null, angka, dsb. = tidak.
 * Dengan begitu layar privasi menampilkan persis apa yang benar-benar dibaca `can_view()`.
 */
export function readPermissions(kind: 'psychologist', raw: unknown): PsychologistPermissions;
export function readPermissions(kind: 'caregiver', raw: unknown): CaregiverPermissions;
export function readPermissions(
  kind: PermissionKind,
  raw: unknown,
): PsychologistPermissions | CaregiverPermissions {
  const source =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const result: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS[kind]) {
    const value = source[key];
    result[key] = value === true || value === 'true';
  }
  return result as PsychologistPermissions | CaregiverPermissions;
}

/** Permintaan mengubah SATU izin. Kunci harus milik jenisnya, nilai harus boolean. */
export const setPermissionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('psychologist'),
      id: z.uuid(),
      key: z.enum(PSYCHOLOGIST_PERMISSION_KEYS),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('caregiver'),
      id: z.uuid(),
      key: z.enum(CAREGIVER_PERMISSION_KEYS),
      enabled: z.boolean(),
    })
    .strict(),
]);

export type SetPermissionInput = z.infer<typeof setPermissionSchema>;
