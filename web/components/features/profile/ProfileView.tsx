import { DownloadSimple, LockKey } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { DeleteAccountSection } from '@/components/features/profile/DeleteAccountSection';
import { FontSizeForm } from '@/components/features/profile/FontSizeForm';
import { ProfileForm } from '@/components/features/profile/ProfileForm';
import { buttonVariants } from '@/components/ui/button-variants';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import type { ProfileDetails } from '@/lib/server/profile';

interface ProfileViewProps {
  details: ProfileDetails;
  knownCities: readonly string[];
}

/**
 * Isi halaman Profil. Dipisah dari halaman supaya pratinjau /dev/profil memakai tampilan yang persis sama dengan
 * halaman sungguhan.
 */
export function ProfileView({ details, knownCities }: ProfileViewProps) {
  return (
    <>
      <section aria-labelledby="judul" className="max-w-[62ch] pt-4 pb-7">
        <h1 id="judul" className="display-3">
          Profilmu
        </h1>
        <p className="mt-2 lead">
          Atur data diri dan tampilan Mindra, unduh salinan datamu, atau hapus akunmu kapan saja.
        </p>
      </section>

      <div className="grid max-w-[62rem] gap-5">
        {details.requestedRole === 'psychologist' ? (
          <Alert tone="info" title="Permintaan akun psikologmu sedang ditinjau" titleAs="h2">
            <p className="mt-1 text-sm">
              Sampai disetujui, akunmu berfungsi seperti akun pengguna biasa. Setelah disetujui,
              keluar lalu masuk lagi supaya akunmu berpindah ke portal psikolog.
            </p>
          </Alert>
        ) : null}

        <Card as="section" aria-labelledby="h-data">
          <CardHeader title="Tentang kamu" titleId="h-data" />
          <ProfileForm details={details} knownCities={knownCities} />
        </Card>

        <Card as="section" aria-labelledby="h-tampilan">
          <CardHeader title="Tampilan" titleId="h-tampilan" />
          <FontSizeForm initial={details.fontSize} />
        </Card>

        <Card as="section" aria-labelledby="h-datamu">
          <CardHeader title="Datamu" titleId="h-datamu" />
          <p className="max-w-[62ch] body-m">
            Unduh salinan semua yang tersimpan tentangmu sebagai berkas JSON: skrining, mood, tidur,
            percakapan, konsultasi, izin, dan riwayat akses. Berkas ini hanya untukmu, jadi simpan
            di tempat yang aman.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {/* <a> biasa, bukan <Link>: tujuannya berkas unduhan dari Route Handler, bukan halaman. */}
            <a href="/profil/unduh" download className={buttonVariants({ variant: 'secondary' })}>
              <DownloadSimple aria-hidden />
              Unduh data saya
            </a>
            <Link href="/privasi" className={buttonVariants({ variant: 'ghost' })}>
              <LockKey aria-hidden />
              Atur izin dan lihat riwayat akses
            </Link>
          </div>
        </Card>

        <Card as="section" aria-labelledby="h-hapus" variant="flat">
          <CardHeader title="Hapus akun" titleId="h-hapus" />
          <p className="max-w-[62ch] body-m">
            Menghapus akun menghapus seluruh datamu dari basis data Mindra seketika. Ini tidak bisa
            dibatalkan. Penjelasan lengkapnya ada di{' '}
            <Link href="/kebijakan-privasi#kendali">kebijakan privasi</Link>.
          </p>
          <div className="mt-4">
            <DeleteAccountSection />
          </div>
        </Card>
      </div>
    </>
  );
}
