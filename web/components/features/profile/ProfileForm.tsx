'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { initialFormState } from '@/lib/auth/form-state';
import { PROVINCES } from '@/lib/domain/region/provinces';
import { updateProfileAction } from '@/lib/profile/actions';
import type { ProfileDetails } from '@/lib/server/profile';
import { CITY_MAX } from '@/lib/validation/profile';

interface ProfileFormProps {
  details: Pick<ProfileDetails, 'name' | 'email' | 'city' | 'province' | 'shareRegionStats'>;
  /** Kota yang sudah punya faskes, sebagai saran penulisan (bukan pembatas). */
  knownCities: readonly string[];
}

export function ProfileForm({ details, knownCities }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);
  const formRef = useFocusFirstError(state);
  // Setelah galat, nilai isian dikembalikan server; selain itu isi dari basis data.
  const value = (key: 'name' | 'city' | 'province', fallback: string) =>
    state.status === 'error' && state.values ? (state.values[key] ?? fallback) : fallback;
  const shareDefault =
    state.status === 'error' && state.values
      ? state.values.shareRegionStats === 'on'
      : details.shareRegionStats;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-4">
      <FormMessage state={state} />

      <Input
        name="name"
        label="Nama panggilan"
        autoComplete="nickname"
        defaultValue={value('name', details.name)}
        error={state.fieldErrors?.name}
        required
      />

      <Input
        name="email"
        label="Email"
        type="email"
        value={details.email}
        readOnly
        helper="Email dipakai untuk masuk dan belum bisa diganti dari sini."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="city"
          label="Kota atau kabupaten"
          optional
          list="saran-kota"
          maxLength={CITY_MAX}
          autoComplete="address-level2"
          defaultValue={value('city', details.city)}
          helper="Tulis seperti nama resminya, mis. Kota Bogor atau Kab. Cianjur."
          error={state.fieldErrors?.city}
        />
        <datalist id="saran-kota">
          {knownCities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <Select
          name="province"
          label="Provinsi"
          optional
          defaultValue={value('province', details.province)}
          error={state.fieldErrors?.province}
        >
          <option value="">Belum dipilih</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg bg-sunken p-4">
        <Checkbox
          name="shareRegionStats"
          defaultChecked={shareDefault}
          error={state.fieldErrors?.shareRegionStats}
          label={
            <span className="grid gap-1">
              <strong className="font-semibold text-fg-1">Ikut statistik wilayah anonim</strong>
              <span className="text-fg-3">
                Kotamu dihitung dalam angka gabungan untuk puskesmas dan dinas kesehatan di
                provinsimu, supaya layanan bisa direncanakan lebih tepat. Tanpa namamu, dan hanya
                tampil bila sedikitnya 10 orang di kota dan pekan yang sama. Bisa kamu matikan kapan
                saja.
              </span>
            </span>
          }
        />
      </div>

      <div className="max-w-xs">
        <SubmitButton>Simpan profil</SubmitButton>
      </div>
    </form>
  );
}
