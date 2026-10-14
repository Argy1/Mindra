import { redirect } from 'next/navigation';
import { TotpChallenge } from '@/components/features/psychologist/TotpChallenge';
import { TotpEnrollment } from '@/components/features/psychologist/TotpEnrollment';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { MFA_ROUTES_BY_ROLE, type MfaRole } from '@/lib/auth/mfa';
import { getAalInfo } from '@/lib/auth/mfa-server';
import { createClient } from '@/lib/supabase/server';
import { formatDateId } from '@/lib/utils/date';

interface MfaViewProps {
  role: MfaRole;
}

/**
 * Halaman "Keamanan akun" untuk peran berMFA (psikolog dan admin faskes). SENGAJA berada di luar gerbang
 * MFA: ke sinilah akun yang belum punya faktor TOTP diarahkan. Menambah perangkat cadangan hanya bisa dari
 * sesi aal2 (aturan Supabase), jadi sesi aal1 yang sudah punya faktor dialihkan ke halaman verifikasi.
 */
export async function MfaSecurityView({
  role,
  required,
  intro,
  requiredNotice,
}: MfaViewProps & {
  /** `?wajib=1`: pengguna dialihkan ke sini karena belum memasang TOTP. */
  required: boolean;
  intro: string;
  requiredNotice: string;
}) {
  const routes = MFA_ROUTES_BY_ROLE[role];
  const supabase = await createClient();
  const [factorsResult, aal] = await Promise.all([supabase.auth.mfa.listFactors(), getAalInfo()]);
  const factors = factorsResult.data?.totp ?? [];

  if (factors.length > 0 && aal?.currentLevel !== 'aal2') redirect(routes.challenge);

  const active = factors.length > 0;

  return (
    <div className="max-w-2xl">
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Keamanan akun
        </h1>
        <p className="mt-1.5 lead">{intro}</p>
      </section>

      {required && !active ? (
        <Alert tone="info" className="mb-5" role="status">
          <p className="text-sm">{requiredNotice}</p>
        </Alert>
      ) : null}

      <Card as="section" aria-labelledby="h-mfa">
        <CardHeader
          title="Verifikasi dua langkah"
          titleId="h-mfa"
          action={
            <Badge tone={active ? 'sage' : 'neutral'}>{active ? 'Aktif' : 'Belum aktif'}</Badge>
          }
        />
        {active ? (
          <div className="grid gap-5">
            <ul className="grid">
              {factors.map((factor) => (
                <li
                  key={factor.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
                >
                  <span className="font-semibold text-fg-1">
                    {factor.friendly_name ?? 'Aplikasi autentikator'}
                  </span>
                  <span className="meta">
                    Dipasang{' '}
                    {formatDateId(new Date(factor.created_at), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <details className="rounded-lg bg-sunken px-5 py-4">
              <summary className="cursor-pointer font-semibold text-fg-1">
                Tambah perangkat cadangan
              </summary>
              <p className="mt-2 mb-4 body-m">
                Bila ponselmu hilang, perangkat cadangan mencegah kamu terkunci dari akunmu.
              </p>
              <TotpEnrollment mode="backup" redirectTo={routes.home} />
            </details>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="body-m">
              Pasang aplikasi autentikator di ponselmu, lalu pindai kode QR yang muncul.
            </p>
            <TotpEnrollment mode="first" redirectTo={routes.home} />
          </div>
        )}
      </Card>
    </div>
  );
}

/** Tujuan akun yang sudah punya faktor TOTP tetapi sesinya belum aal2. Di luar gerbang MFA. */
export async function MfaVerifyView({ role, intro }: MfaViewProps & { intro: string }) {
  const routes = MFA_ROUTES_BY_ROLE[role];
  const supabase = await createClient();
  const [factorsResult, aal] = await Promise.all([supabase.auth.mfa.listFactors(), getAalInfo()]);

  if (aal?.currentLevel === 'aal2') redirect(routes.home);
  const factor = factorsResult.data?.totp[0];
  if (!factor) redirect(`${routes.enroll}?wajib=1`);

  return (
    <div className="max-w-xl">
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Satu langkah lagi
        </h1>
        <p className="mt-1.5 lead">{intro}</p>
      </section>
      <Card>
        <TotpChallenge factorId={factor.id} redirectTo={routes.home} />
      </Card>
    </div>
  );
}
