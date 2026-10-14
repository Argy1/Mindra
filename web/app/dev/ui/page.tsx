import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarHeart,
  Notebook,
  Phone,
  Plus,
  UserPlus,
} from '@phosphor-icons/react/ssr';
import { Container } from '@/components/layout/Container';
import { Logo } from '@/components/layout/Logo';
import { SkipLink } from '@/components/layout/SkipLink';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { CrisisBanner } from '@/components/ui/CrisisBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { Textarea } from '@/components/ui/Textarea';
import { ASSESSMENT_CATEGORIES } from '@/lib/domain/assessment/category';
import { ChipDemo } from './_components/ChipDemo';
import { DemoRow, DemoSection } from './_components/DemoSection';
import { OverlayDemo } from './_components/OverlayDemo';
import { Swatches } from './_components/Swatches';
import { SwitchDemo } from './_components/SwitchDemo';
import { TabsDemo } from './_components/TabsDemo';

const SECTIONS = [
  ['warna', 'Warna'],
  ['tipografi', 'Tipografi'],
  ['tombol', 'Tombol'],
  ['kartu', 'Kartu'],
  ['chip-badge', 'Chip dan lencana'],
  ['form', 'Form'],
  ['tabs', 'Tab'],
  ['overlay', 'Dialog dan toast'],
  ['alert', 'Alert dan banner krisis'],
  ['status', 'Kosong, memuat, avatar, progres'],
] as const;

export default function UiPreviewPage() {
  return (
    <>
      <SkipLink />
      <main id="isi" tabIndex={-1} className="focus-visible:shadow-none focus-visible:outline-none">
        <Container className="py-10">
          <header className="grid gap-4 pb-10">
            <Logo size="lg" />
            <h1 className="display-2">Pratinjau komponen</h1>
            <p className="lead">
              Katalog semua komponen di <code>components/ui</code> dan{' '}
              <code>components/layout</code>. Halaman ini hanya muncul saat pengembangan. Bandingkan
              dengan <code>design/*.html</code>.
            </p>
            <nav aria-label="Daftar bagian" className="flex flex-wrap gap-2">
              {SECTIONS.map(([id, label]) => (
                <Link
                  key={id}
                  href={`#${id}`}
                  className="inline-flex min-h-9 items-center rounded-pill border border-line-soft bg-raised px-3.5 text-sm font-medium text-fg-2 no-underline hover:border-biru-200"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <p className="body-m">
              Kerangka halaman: <Link href="/dev/shell">AppShell (sidebar + bottom nav)</Link> ·
              header, footer, dan pita krisis marketing ada di <Link href="/">beranda publik</Link>.
            </p>
          </header>

          <DemoSection
            id="warna"
            title="Warna"
            description="Token dari design/tokens.css, dipetakan ke tema Tailwind. Palet bawaan Tailwind dinonaktifkan, jadi hanya warna ini yang bisa dipakai."
          >
            <Swatches />
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-fg-1">Teks di atas kanvas</p>
              <div className="grid gap-1 rounded-lg bg-canvas p-4">
                <p className="text-fg-1">fg-1 · judul dan teks utama</p>
                <p className="text-fg-2">fg-2 · isi paragraf</p>
                <p className="text-fg-3">fg-3 · teks sekunder</p>
                <p className="text-fg-4">
                  fg-4 · teks meta, bantuan, placeholder (disesuaikan agar ≥ 4,5:1)
                </p>
              </div>
            </div>
          </DemoSection>

          <DemoSection
            id="tipografi"
            title="Tipografi"
            description="Serif (Instrument Serif) untuk momen manusiawi; sans (Plus Jakarta Sans) untuk kerja. Ukuran dalam rem, jadi ikut pengaturan ukuran font pengguna."
          >
            <div className="grid gap-5 rounded-lg bg-raised p-6 shadow-sm">
              <p className="display-1">Display 1</p>
              <p className="display-2">Display 2 · judul section</p>
              <p className="display-3">Display 3 · Selamat sore, Argy.</p>
              <p className="h1">Heading 1 · judul dalam aplikasi</p>
              <p className="h2">Heading 2 · judul kartu besar</p>
              <p className="h3">Heading 3 · judul kartu</p>
              <p className="lead">
                Lead · Mindra menemanimu mengenali perasaan setiap hari, dan terhubung ke yang bisa
                membantu.
              </p>
              <p>Body 16px / 1,6 · teks utama untuk paragraf yang nyaman dibaca lama.</p>
              <p className="body-m">Body-m 14px · teks sekunder pada kartu.</p>
              <p className="meta">Meta 13px · waktu dan keterangan</p>
              <p className="text-fg-1 num">
                <span className="font-semibold">Angka tabular:</span> 1.284 · 7,4 · 23% · 08.45
              </p>
            </div>
          </DemoSection>

          <DemoSection
            id="tombol"
            title="Tombol"
            description="Pil 48px. Ukuran sm tampil 40px tetapi area sentuhnya 44px."
          >
            <DemoRow label="Varian">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="sage">Sage</Button>
              <Button variant="crisis">
                <Phone aria-hidden />
                Crisis
              </Button>
            </DemoRow>
            <DemoRow label="Ukuran sm · md · lg">
              <Button size="sm">Kecil</Button>
              <Button size="md">Sedang</Button>
              <Button size="lg">Besar</Button>
            </DemoRow>
            <DemoRow label="Dengan ikon">
              <Button>
                <Plus aria-hidden />
                Check-in baru
              </Button>
              <Button variant="secondary">
                Lanjut
                <ArrowRight aria-hidden />
              </Button>
            </DemoRow>
            <DemoRow label="Status: memproses · nonaktif · tautan">
              <Button loading>Menyimpan</Button>
              <Button disabled>Nonaktif</Button>
              <Button href="/dev/shell" variant="secondary">
                Tautan internal
              </Button>
            </DemoRow>
            <DemoRow label="Tombol ikon (44×44px)">
              <IconButton label="Notifikasi">
                <Bell />
              </IconButton>
              <IconButton label="Undang pendamping">
                <UserPlus />
              </IconButton>
            </DemoRow>
            <div className="max-w-sm">
              <Button block>Tombol selebar wadah</Button>
            </div>
          </DemoSection>

          <DemoSection id="kartu" title="Kartu">
            <div className="grid gap-5 md:grid-cols-3">
              <Card as="section" aria-labelledby="kartu-1">
                <CardHeader
                  titleId="kartu-1"
                  title="Kartu biasa"
                  action={<span className="meta">PHQ-9, 6 Okt</span>}
                />
                <p className="body-m">Putih di atas kanvas krem dengan bayangan lembut.</p>
              </Card>
              <Card as="section" variant="flat" aria-labelledby="kartu-2">
                <CardHeader titleId="kartu-2" title="Kartu flat" />
                <p className="body-m">Hanya garis tipis, tanpa bayangan.</p>
              </Card>
              <Card as="section" variant="sunken" aria-labelledby="kartu-3">
                <CardHeader
                  titleId="kartu-3"
                  title={
                    <>
                      <CalendarHeart aria-hidden className="size-5 text-sage-700" /> Kartu sunken
                    </>
                  }
                />
                <p className="body-m">Zona bersarang, sedikit lebih gelap dari kanvas.</p>
              </Card>
            </div>
            <Card as="section" hero aria-labelledby="kartu-hero">
              <CardHeader
                titleId="kartu-hero"
                title="Kartu hero"
                action={<Badge tone="sage">Izin aktif</Badge>}
              />
              <p className="lead">Dipakai untuk satu momen utama di tiap halaman.</p>
            </Card>
          </DemoSection>

          <DemoSection id="chip-badge" title="Chip dan lencana">
            <DemoRow label="Chip filter (klik untuk berpindah)">
              <ChipDemo />
            </DemoRow>
            <DemoRow label="Lencana kategori skrining">
              {ASSESSMENT_CATEGORIES.map((category) => (
                <CategoryBadge key={category} category={category} />
              ))}
            </DemoRow>
            <DemoRow label="Lencana lain">
              <Badge>Netral</Badge>
              <Badge tone="sage">Izin aktif</Badge>
              <Badge tone="neutral" dot={false}>
                Tanpa titik
              </Badge>
            </DemoRow>
          </DemoSection>

          <DemoSection
            id="form"
            title="Form"
            description="Setiap kolom wajib punya label (diwajibkan oleh tipe TypeScript). Batas kolom 3:1 terhadap latar."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Nama panggilan" placeholder="Mis. Argy" autoComplete="nickname" />
              <Input
                label="Email"
                type="email"
                helper="Dipakai untuk masuk dan pemulihan sandi."
                autoComplete="email"
              />
              <Input
                label="Kata sandi"
                type="password"
                error="Kata sandi minimal 8 karakter. Tambahkan beberapa karakter lagi."
                defaultValue="abc"
                autoComplete="new-password"
              />
              <Input label="Nomor telepon" optional inputMode="tel" />
              <Input label="Cari klien" hideLabel placeholder="Cari klien" type="search" />
              <Select label="Kota" defaultValue="bogor">
                <option value="bogor">Kota Bogor</option>
                <option value="depok">Kota Depok</option>
                <option value="bandung">Kota Bandung</option>
              </Select>
              <Textarea
                label="Catatan"
                optional
                helper="Hanya kamu yang bisa membaca catatan ini."
                placeholder="Apa yang sedang kamu pikirkan?"
                wrapperClassName="md:col-span-2"
              />
            </div>
            <DemoRow label="Saklar izin (role=switch)">
              <SwitchDemo />
            </DemoRow>
          </DemoSection>

          <DemoSection
            id="tabs"
            title="Tab"
            description="Pola ARIA Tabs: panah kiri/kanan, Home, End."
          >
            <Card>
              <TabsDemo />
            </Card>
          </DemoSection>

          <DemoSection
            id="overlay"
            title="Dialog dan toast"
            description="Dialog memakai elemen <dialog> native: fokus terjebak di dalam, ESC menutup, fokus kembali ke tombol pemicu."
          >
            <OverlayDemo />
          </DemoSection>

          <DemoSection
            id="alert"
            title="Alert dan banner krisis"
            description="Merah hanya untuk krisis dan galat. Nomor darurat selalu dari lib/domain/crisis/resources.ts."
          >
            <CrisisBanner
              title="Kamu tidak harus menghadapinya sendirian."
              focusOnMount={false}
              actions={<Button variant="secondary">Kabari Rina Sari, M.Psi.</Button>}
              footnote="Psikologmu sudah menerima pemberitahuan karena kamu mengizinkan peringatan krisis."
            >
              <p>
                Kamu menjawab pernah terpikir lebih baik mati atau ingin menyakiti diri. Itu tanda
                kamu sedang memikul hal yang sangat berat. Bicara dengan seseorang sekarang bisa
                membantu.
              </p>
            </CrisisBanner>
            <Alert tone="info" title="Info" titleAs="h3">
              <p className="body-m text-biru-800">Kabar netral yang tidak mendesak.</p>
            </Alert>
            <Alert tone="note" compact>
              <p className="body-m">
                Ini hasil skrining, bukan diagnosis. Hanya psikolog atau psikiater yang bisa
                menegakkan diagnosis.
              </p>
            </Alert>
          </DemoSection>

          <DemoSection id="status" title="Kosong, memuat, avatar, progres">
            <EmptyState
              icon={<Notebook />}
              title="Belum ada catatan minggu ini"
              description="Mulai dengan satu check-in. Cukup dua menit."
              action={
                <Button size="sm">
                  <Plus aria-hidden />
                  Mulai check-in
                </Button>
              }
            />
            <div className="grid gap-5 md:grid-cols-2">
              <SkeletonCard lines={3} />
              <Card className="grid gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </Card>
            </div>
            <DemoRow label="Avatar (inisial dari nama)">
              <Avatar name="Rina Sari, M.Psi." tone="biru" />
              <Avatar name="Ibu" />
              <Avatar name="Dimas Pratama" tone="matahari" />
              <Avatar name="Argy" size="sm" tone="biru" />
            </DemoRow>
            <div className="grid max-w-md gap-4">
              <Progress label="Pertanyaan 3 dari 9" value={3} max={9} />
              <Progress label="Pertanyaan 9 dari 9" value={9} max={9} />
            </div>
          </DemoSection>
        </Container>
      </main>
    </>
  );
}
