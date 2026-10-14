import type { InstrumentId } from '@/lib/domain/assessment/instruments';
import type { Answers } from '@/lib/domain/assessment/scoring';

/**
 * Deteksi krisis. Dua jalur, keduanya port dari aplikasi Flutter:
 *
 *   1. Butir asesmen (`AssessmentSession._detectCrisis`): PHQ-9 butir 9 (pikiran lebih baik mati /
 *      menyakiti diri) dan SRQ-20 butir 17 (pikiran mengakhiri hidup) dengan jawaban > 0.
 *   2. Kata kunci pada teks bebas (`CrisisDetector.detect`, teman cerita AI).
 *
 * Aturan butir HARUS sama dengan trigger database `create_crisis_alert_from_assessment`
 * (20261014000000_web_ecosystem.sql); tests/db/assessment-parity.test.ts menjaganya.
 * Detektor ini sengaja condong ke kewaspadaan: positif palsu dapat diterima, kasus terlewat tidak.
 */

/** Butir yang menandakan pikiran menyakiti/mengakhiri hidup, per instrumen. */
export const CRISIS_ITEM: Readonly<Partial<Record<InstrumentId, string>>> = {
  phq9: 'phq9_9',
  srq20: 'srq20_17',
};

/** True bila jawaban butir krisis instrumen ini lebih dari 0. Instrumen tanpa butir krisis selalu false. */
export function detectAssessmentCrisis(id: InstrumentId, answers: Answers): boolean {
  const item = CRISIS_ITEM[id];
  return item !== undefined && (answers[item] ?? 0) > 0;
}

/**
 * Frasa krisis berbahasa Indonesia (dan campuran Indonesia–Inggris), sama dengan
 * `CrisisDetector._keywords` di Flutter. Dicocokkan sebagai substring pada teks huruf kecil.
 */
export const CRISIS_KEYWORDS: readonly string[] = [
  // Pikiran bunuh diri yang eksplisit
  'bunuh diri',
  'bundir',
  'mati saja',
  'pengen mati',
  'pengin mati',
  'ingin mati',
  'mau mati',
  'lebih baik mati',
  'lebih baik kalau aku mati',
  'mati aja',
  'mati aja deh',
  'akhiri hidup',
  'mengakhiri hidup',
  'menyudahi hidup',
  'akhiri saja semua',

  // Putus asa / tidak ingin hidup
  'tidak mau hidup',
  'gak mau hidup',
  'ga mau hidup',
  'tak mau hidup',
  'tidak ada gunanya hidup',
  'tidak ada artinya hidup',
  'hidup tidak berarti',
  'hidup gak berarti',
  'percuma hidup',
  'kalau aku tidak ada',
  'kalau aku gak ada',
  'kalo aku ga ada',

  // Kelelahan / batas kemampuan
  'sudah tidak kuat',
  'udah tidak kuat',
  'udah gak kuat',
  'gak kuat lagi',
  'ga kuat lagi',
  'tak kuat lagi',
  'tidak sanggup lagi',

  // Menyakiti diri
  'menyakiti diri',
  'menyakiti diriku',
  'menyakiti diri sendiri',
  'melukai diri',
  'melukai diri sendiri',
  'menyayat',
  'self harm',
  'self-harm',
  'overdosis',
];

/** Huruf kecil dan spasi berulang dipadatkan, agar "Bunuh   DIRI" tetap terdeteksi. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True bila teks memuat salah satu frasa krisis. */
export function detectCrisisText(text: string): boolean {
  if (text.length === 0) return false;
  const normalized = normalize(text);
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
