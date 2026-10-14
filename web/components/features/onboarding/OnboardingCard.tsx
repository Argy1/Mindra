'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { initialFormState } from '@/lib/auth/form-state';
import { ONBOARDING_STEPS } from '@/lib/domain/onboarding/steps';
import { dismissOnboardingAction } from '@/lib/onboarding/actions';

/**
 * Panduan awal di Beranda untuk pengguna baru: tiga langkah opsional dan satu tombol untuk menyembunyikannya. Menyembunyikan
 * menulis penanda ke metadata akun (bukan ke perangkat), jadi panduan tidak muncul lagi di perangkat lain. Bila
 * penyimpanan gagal, panduan tetap tampil dan alasannya dijelaskan.
 */
export function OnboardingCard() {
  const [state, formAction, pending] = useActionState(dismissOnboardingAction, initialFormState);

  return (
    <Card as="section" aria-labelledby="panduan-awal" className="mt-4 grid gap-5">
      <div>
        <p className="meta">Panduan awal</p>
        <h2 id="panduan-awal" className="mt-1 h3">
          Selamat datang di Mindra
        </h2>
        <p className="mt-1.5 body-m">
          Tiga hal yang biasanya membantu di awal. Semuanya opsional, dan bisa kamu lakukan kapan
          saja.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {ONBOARDING_STEPS.map((step, index) => (
          <li key={step.id} className="grid content-start gap-2 rounded-lg bg-sunken p-4">
            <p className="meta">Langkah {index + 1}</p>
            <h3 className="font-semibold text-fg-1">{step.title}</h3>
            <p className="text-sm text-fg-2">{step.description}</p>
            <div className="pt-1">
              <Button variant="secondary" size="sm" href={step.href}>
                {step.cta}
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="ghost" size="sm" loading={pending}>
          Sembunyikan panduan ini
        </Button>
        {state.status === 'error' ? (
          <p role="alert" className="text-sm text-danger-700">
            {state.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
