'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { CodeBlock } from '@/components/features/developers/CodeBlock';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { initialFormState } from '@/lib/auth/form-state';
import { createApiKeyAction } from '@/lib/faskes/actions';
import type { ManagedFacility } from '@/lib/server/faskes';
import { API_KEY_NAME_MAX } from '@/lib/validation/faskes';

/**
 * Membuat kunci API. Kunci utuh ditampilkan SEKALI di bawah formulir (hanya hash-nya yang tersimpan), dengan
 * tombol salin. Menyegarkan halaman atau berpindah halaman menghapusnya, dan itu memang tujuannya.
 */
export function CreateApiKeyForm({ facilities }: { facilities: readonly ManagedFacility[] }) {
  const [state, formAction, pending] = useActionState(createApiKeyAction, initialFormState);
  const formRef = useFocusFirstError(state);
  const apiKey = state.status === 'success' ? state.values?.apiKey : undefined;

  if (facilities.length === 0) {
    return (
      <Alert tone="note" compact>
        <p className="text-sm">
          Akunmu belum terhubung ke faskes mana pun, jadi belum bisa membuat kunci. Hubungi admin
          sistem Mindra untuk menautkan akunmu ke faskes.
        </p>
      </Alert>
    );
  }

  return (
    <div className="grid gap-5">
      <form ref={formRef} action={formAction} noValidate className="grid max-w-lg gap-4">
        {/* Keberhasilan ditampilkan oleh panel kunci di bawah; di sini hanya galat. */}
        <FormMessage state={state.status === 'error' ? state : initialFormState} />
        <Input
          name="name"
          label="Nama kunci"
          helper="Untuk mengenali kunci ini nanti, mis. Dinkes Kota Bogor, sistem pelaporan."
          maxLength={API_KEY_NAME_MAX}
          autoComplete="off"
          defaultValue={state.status === 'error' ? (state.values?.name ?? '') : ''}
          error={state.fieldErrors?.name}
        />
        <Select
          name="facilityId"
          label="Faskes"
          helper="Kunci ini hanya bisa membaca agregat anonim faskes ini."
          defaultValue={
            (state.status === 'error' ? state.values?.facilityId : undefined) ?? facilities[0]?.id
          }
          error={state.fieldErrors?.facilityId}
        >
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name} ({facility.city})
            </option>
          ))}
        </Select>
        <div>
          <Button type="submit" loading={pending}>
            Buat kunci
          </Button>
        </div>
      </form>

      {apiKey ? (
        <Alert tone="success" role="status" title="Salin kuncinya sekarang" titleAs="h3">
          <p className="mt-1 text-sm">{state.message}</p>
          <div className="mt-3">
            <CodeBlock label="Kunci API baru" code={apiKey} />
          </div>
          <p className="mt-3 text-sm">
            Pakai sebagai header <code className="font-mono">X-API-Key</code>. Siapa pun yang
            memegang kunci ini bisa membaca agregat anonim faskesmu, jadi simpan seperti kata sandi.
          </p>
        </Alert>
      ) : null}
    </div>
  );
}
