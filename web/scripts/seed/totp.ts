/**
 * Pengaman verifikasi dua langkah (TOTP) untuk skrip seed. Akun psikolog, admin faskes, dan admin demo WAJIB TOTP, dan
 * memasangnya ulang berarti memindai kode QR lagi di ponsel pemilik. Karena itu:
 *   - hanya `--reset` yang boleh menghapus akun, dan ia menolak bila ada TOTP terverifikasi (atau TOTP tidak bisa
 *     diperiksa) kecuali `--hapus-totp`;
 *   - `--refresh` mencetak jumlah TOTP sebelum dan sesudah, dan gagal bila berkurang.
 * Modul ini hanya MEMBACA faktor TOTP lewat API admin; tidak pernah menghapus atau mendaftarkannya.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_ACCOUNTS, type DemoAccount } from './catalog';

/** Peran demo yang wajib TOTP (sama dengan portal psikolog, faskes, dan admin). */
export const TOTP_ROLES: ReadonlySet<DemoAccount['role']> = new Set([
  'psychologist',
  'facility_admin',
  'admin',
]);

/** email akun demo → jumlah faktor TOTP terverifikasi. */
export type TotpSnapshot = ReadonlyMap<string, number>;

type TotpClient = Pick<SupabaseClient, 'from' | 'auth'>;

/** Jumlah TOTP terverifikasi per akun demo yang wajib TOTP. Hanya MEMBACA. Gagal membaca = null. */
export async function totpSnapshot(db: TotpClient): Promise<TotpSnapshot | null> {
  const emails = DEMO_ACCOUNTS.filter((account) => TOTP_ROLES.has(account.role)).map(
    (account) => account.email,
  );
  const { data, error } = await db.from('profiles').select('id, email').in('email', emails);
  if (error) return null;

  const snapshot = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ id: string; email: string }>) {
    const { data: factors, error: factorError } = await db.auth.admin.mfa.listFactors({
      userId: row.id,
    });
    if (factorError) return null;
    snapshot.set(
      row.email,
      (factors?.factors ?? []).filter((factor) => factor.status === 'verified').length,
    );
  }
  return snapshot;
}

export function describeTotp(snapshot: TotpSnapshot): string {
  return [...snapshot].map(([email, count]) => `${email.split('@')[0]}=${count}`).join(', ');
}

/** Akun yang TOTP-nya berkurang atau hilang dari `after` dibanding `before`. */
export function findTotpLoss(before: TotpSnapshot, after: TotpSnapshot): string[] {
  return [...before]
    .filter(([email, count]) => (after.get(email) ?? 0) < count)
    .map(([email]) => email);
}

export type ResetDecision = { allowed: true } | { allowed: false; reason: string };

/**
 * Bolehkah `--reset` (menghapus akun demo beserta TOTP-nya) berjalan? Menolak bila ada TOTP terverifikasi, atau bila
 * TOTP tidak bisa diperiksa (tidak bisa memastikan aman), kecuali pemanggil memberi `--hapus-totp`.
 */
export function decideReset(snapshot: TotpSnapshot | null, allowTotpLoss: boolean): ResetDecision {
  if (allowTotpLoss) return { allowed: true };
  if (snapshot === null) {
    return {
      allowed: false,
      reason:
        'TOTP akun demo tidak bisa diperiksa, jadi tidak bisa dipastikan aman. --reset menghapus akun beserta TOTP-nya; ulangi dengan --hapus-totp bila memang ingin, atau pakai `pnpm seed --refresh` untuk menyegarkan data tanpa menyentuh akun.',
    };
  }
  const withTotp = new Map([...snapshot].filter(([, count]) => count > 0));
  if (withTotp.size > 0) {
    return {
      allowed: false,
      reason: `akun demo ini punya TOTP terverifikasi (${describeTotp(withTotp)}) dan --reset akan MENGHAPUS akunnya beserta TOTP-nya. Untuk menyegarkan data tanpa kehilangan TOTP pakai \`pnpm seed --refresh\`. Bila memang ingin menghapus akun, ulangi dengan --hapus-totp.`,
    };
  }
  return { allowed: true };
}
