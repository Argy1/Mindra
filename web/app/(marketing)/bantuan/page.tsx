import type { Metadata } from 'next';
import Link from 'next/link';
import { ChatsCircle, CalendarHeart, MapPin, Phone } from '@phosphor-icons/react/ssr';
import { BreathingExercise } from '@/components/features/support/BreathingExercise';
import { GroundingExercise } from '@/components/features/support/GroundingExercise';
import { ProseSection } from '@/components/features/marketing/ProseSection';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CRISIS_RESOURCES,
  PRIMARY_CRISIS_RESOURCE,
  crisisCallLabel,
} from '@/lib/domain/crisis/resources';

export const metadata: Metadata = {
  title: 'Bantuan sekarang',
  description:
    'Kontak bantuan krisis, latihan napas terpandu, dan latihan grounding. Terbuka tanpa masuk akun dan tidak menyimpan apa pun tentangmu.',
  alternates: { canonical: '/bantuan' },
};

const OPTIONS = [
  {
    href: '/teman-cerita',
    icon: ChatsCircle,
    title: 'Bercerita ke Teman cerita',
    body: 'Ngobrol kapan saja dengan AI yang mendengarkan tanpa menghakimi. Ia bukan psikolog, dan kalau kamu menulis hal yang berbahaya, ia mengarahkanmu ke bantuan.',
  },
  {
    href: '/konsultasi',
    icon: CalendarHeart,
    title: 'Pesan sesi dengan psikolog',
    body: 'Pilih psikolog dan jam yang cocok. Kamu yang mengatur apa saja yang boleh ia lihat.',
  },
  {
    href: '/layanan-terdekat',
    icon: MapPin,
    title: 'Cari layanan kesehatan terdekat',
    body: 'Puskesmas dan rumah sakit yang punya layanan kesehatan jiwa. Lokasimu tidak dikirim ke server.',
  },
] as const;

export default function SupportPage() {
  return (
    <Container className="pt-12 pb-24">
      <article className="max-w-reading">
        <p className="meta">Bantuan</p>
        <h1 className="mt-1 display-3">Kamu tidak harus menghadapinya sendirian</h1>
        <p className="mt-4 lead">
          Halaman ini terbuka tanpa masuk akun dan tidak menyimpan apa pun tentangmu. Mulai dari
          yang paling kamu butuhkan sekarang.
        </p>

        <ProseSection id="darurat" title="Kalau kamu atau orang di dekatmu dalam bahaya sekarang">
          <Alert tone="crisis" title="Jangan menunggu. Ada yang siap mendengar." titleAs="h3">
            Kalau kamu berpikir untuk menyakiti diri atau mengakhiri hidup, atau sedang bersama
            orang yang begitu, hubungi salah satu nomor di bawah sekarang. Kalau memungkinkan,
            jangan sendirian: minta seseorang menemanimu, dan jauhkan benda yang bisa kamu pakai
            untuk menyakiti diri.
          </Alert>
          <ul className="grid gap-3">
            {CRISIS_RESOURCES.map((resource) => (
              <li key={resource.id}>
                <Card as="section" variant="flat" aria-label={resource.name} className="grid gap-3">
                  <div>
                    <p className="font-semibold text-fg-1">
                      {resource.name} · {resource.displayNumber}
                    </p>
                    <p className="mt-1 text-sm text-fg-2">
                      {resource.description} Tersedia {resource.availability}.
                    </p>
                  </div>
                  <div>
                    <Button
                      variant={resource.id === PRIMARY_CRISIS_RESOURCE.id ? 'crisis' : 'secondary'}
                      href={resource.telHref}
                    >
                      <Phone aria-hidden />
                      {crisisCallLabel(resource)}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <p>
            Kalau bahayanya ada di depan mata, atau tidak ada yang menjawab, datanglah ke unit gawat
            darurat (IGD) rumah sakit terdekat atau minta orang di sekitarmu membantu.
          </p>
        </ProseSection>

        <ProseSection id="menenangkan-diri" title="Menenangkan diri sekarang">
          <p>
            Dua latihan singkat untuk meredakan rasa panik atau tegang. Keduanya tidak menggantikan
            bantuan profesional, dan kamu boleh berhenti kapan saja.
          </p>
          <Card as="section" aria-labelledby="napas" className="grid gap-4">
            <h3 id="napas" className="text-lg font-bold text-fg-1">
              Napas terpandu
            </h3>
            <BreathingExercise />
          </Card>
          <Card as="section" aria-labelledby="grounding" className="grid gap-4">
            <h3 id="grounding" className="text-lg font-bold text-fg-1">
              Grounding 5-4-3-2-1
            </h3>
            <GroundingExercise />
          </Card>
        </ProseSection>

        <ProseSection id="bicara" title="Kalau kamu ingin bicara dengan seseorang">
          <ul className="grid gap-3">
            {OPTIONS.map((option) => (
              <li key={option.href}>
                <Link
                  href={option.href}
                  className="flex items-start gap-4 rounded-lg bg-raised p-5 text-fg-2 no-underline shadow-sm hover:bg-sunken"
                >
                  <option.icon
                    aria-hidden
                    weight="duotone"
                    className="mt-0.5 size-7 shrink-0 text-biru-600"
                  />
                  <span>
                    <span className="block font-semibold text-fg-1">{option.title}</span>
                    <span className="mt-1 block text-sm">{option.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p>
            Bagian ini butuh akun Mindra. Kalau belum masuk, kamu akan diminta masuk lebih dulu.
          </p>
        </ProseSection>

        <ProseSection id="menemani" title="Kalau kamu menemani orang yang sedang berat">
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong className="text-fg-1">Dengarkan dulu.</strong> Tidak perlu langsung memberi
              solusi atau menilai apakah perasaannya pantas.
            </li>
            <li>
              <strong className="text-fg-1">Tanyakan dengan tenang dan langsung.</strong> Misalnya:
              &ldquo;Apakah kamu sedang berpikir untuk mengakhiri hidup?&rdquo; Bertanya tidak
              menanamkan ide itu; sering justru melegakan.
            </li>
            <li>
              <strong className="text-fg-1">Tetap bersamanya</strong>, atau pastikan ada orang lain
              yang menemaninya, kalau ia dalam bahaya sekarang.
            </li>
            <li>
              <strong className="text-fg-1">
                Jauhkan benda yang bisa dipakai untuk menyakiti diri
              </strong>
              , kalau aman melakukannya.
            </li>
            <li>
              <strong className="text-fg-1">Bantu ia menghubungi bantuan.</strong> Telepon{' '}
              {PRIMARY_CRISIS_RESOURCE.name} di{' '}
              <a href={PRIMARY_CRISIS_RESOURCE.telHref}>{PRIMARY_CRISIS_RESOURCE.displayNumber}</a>{' '}
              bersamanya, atau antar ia ke IGD terdekat.
            </li>
            <li>
              <strong className="text-fg-1">Jaga dirimu juga.</strong> Menemani orang yang sedang
              berat itu melelahkan. Kamu boleh menelepon {PRIMARY_CRISIS_RESOURCE.name} untuk bicara
              tentang apa yang kamu rasakan.
            </li>
          </ul>
        </ProseSection>

        <ProseSection id="catatan" title="Tentang halaman ini">
          <Alert tone="note" compact>
            Mindra adalah alat pendamping, bukan layanan gawat darurat dan bukan pengganti psikolog
            atau psikiater. Latihan di halaman ini berjalan sepenuhnya di perangkatmu: tidak ada
            yang kamu ketik, tidak ada yang direkam, dan tidak ada yang dikirim.
          </Alert>
        </ProseSection>
      </article>
    </Container>
  );
}
