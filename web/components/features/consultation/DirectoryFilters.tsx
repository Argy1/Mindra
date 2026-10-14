import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  languageLabel,
  SORT_LABEL,
  SORT_OPTIONS,
  type DirectoryFilters as Filters,
} from '@/lib/domain/consultation/directory';

interface DirectoryFiltersProps {
  filters: Filters;
  facets: { specializations: string[]; languages: string[] };
  /** Tujuan formulir (`GET`); filter hidup di URL supaya bisa dibagikan dan tombol kembali bekerja. */
  action?: string;
}

/** Penyaring direktori: formulir GET biasa, tanpa JavaScript klien. */
export function DirectoryFilters({
  filters,
  facets,
  action = '/konsultasi',
}: DirectoryFiltersProps) {
  const active =
    filters.q !== '' ||
    filters.specialization !== '' ||
    filters.language !== '' ||
    filters.availableNow;

  return (
    <form
      action={action}
      method="get"
      role="search"
      aria-label="Cari psikolog"
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 wide:grid-cols-4">
        <Input
          name="q"
          label="Cari nama atau topik"
          type="search"
          defaultValue={filters.q}
          maxLength={60}
          placeholder="mis. kecemasan"
          autoComplete="off"
        />
        <Select name="spesialisasi" label="Spesialisasi" defaultValue={filters.specialization}>
          <option value="">Semua</option>
          {facets.specializations.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
        <Select name="bahasa" label="Bahasa" defaultValue={filters.language}>
          <option value="">Semua</option>
          {facets.languages.map((code) => (
            <option key={code} value={code}>
              {languageLabel(code)}
            </option>
          ))}
        </Select>
        <Select name="urut" label="Urutkan" defaultValue={filters.sort}>
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABEL[option]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-fg-1">
          <input
            type="checkbox"
            name="sekarang"
            value="1"
            defaultChecked={filters.availableNow}
            className="size-5 accent-biru-600"
          />
          Hanya yang tersedia sekarang
        </label>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" size="sm">
            <MagnifyingGlass aria-hidden />
            Terapkan
          </Button>
          {active ? (
            <Link href={action} className="text-sm font-semibold">
              Hapus filter
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
