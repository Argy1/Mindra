import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Jejak "siapa membuka data siapa" (CLAUDE.md: setiap akses psikolog/pendamping/faskes ke data milik
 * orang lain wajib dicatat). Pemanggilnya SELALU memanggil ini SEBELUM membaca datanya, dan GAGAL TERTUTUP:
 * bila pencatatan gagal, `AuditError` dilempar dan halaman tidak menampilkan data. Lebih baik layar
 * galat daripada data klien terbuka tanpa jejak.
 *
 * Penegakan sebenarnya ada di database: `log_access()` menolak pemanggil yang tidak berhak
 * (can_view = false), jadi jejak tidak bisa dipalsukan atau dipakai membanjiri riwayat orang lain.
 * Pembukaan berulang dalam 5 menit dicatat sekali (refresh halaman bukan banyak entri).
 */

export const AUDIT_RESOURCES = [
  'assessments',
  'mood',
  'sleep',
  'crisis_alerts',
  'ai_summary',
] as const;
export type AuditResource = (typeof AUDIT_RESOURCES)[number];
export type AuditAction = 'read' | 'export' | 'acknowledge';

export class AuditError extends Error {
  constructor() {
    super('Gagal mencatat akses data.');
    this.name = 'AuditError';
  }
}

export async function auditAccess(
  subject: string,
  resource: AuditResource,
  action: AuditAction = 'read',
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('log_access', {
    p_subject: subject,
    p_resource: resource,
    p_action: action,
  });
  if (error) throw new AuditError();
}

/** Satu panggilan untuk banyak klien (dasbor ringkasan). Subjek ganda dibuang; kosong = tidak melakukan apa pun. */
export async function auditAccessMany(
  subjects: readonly string[],
  resource: AuditResource,
  action: AuditAction = 'read',
): Promise<void> {
  const unique = [...new Set(subjects)];
  if (unique.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc('log_access_batch', {
    p_subjects: unique,
    p_resource: resource,
    p_action: action,
  });
  if (error) throw new AuditError();
}
