import { Bell } from '@phosphor-icons/react/ssr';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { IconButton } from '@/components/ui/IconButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatDateId } from '@/lib/utils/date';

// Tanggal di topbar harus tanggal hari ini, bukan tanggal saat build.
export const dynamic = 'force-dynamic';

/**
 * Pratinjau AppShell dengan isi mirip design/app-beranda.html (versi ringkas — beranda asli
 * dibangun di Fase 1). Periksa: sidebar ≥ 961px, bottom nav di bawahnya, tombol bantuan krisis,
 * skip link (tekan Tab sekali), dan topbar lengket saat menggulir.
 */
export default function ShellPreviewPage() {
  return (
    <AppShell
      role="user"
      user={{ name: 'Argy', roleLabel: 'Pengguna' }}
      currentPath="/beranda"
      topbarStart={<p>{formatDateId(new Date())}</p>}
      topbarActions={
        <IconButton label="Notifikasi">
          <Bell />
        </IconButton>
      }
    >
      <section aria-labelledby="sapa" className="pt-4 pb-7">
        <h1 id="sapa" className="display-3">
          Selamat sore, Argy.
        </h1>
        <p className="mt-1.5 lead">Bagaimana perasaanmu sekarang?</p>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card as="section" hero aria-labelledby="h-insight">
          <Tabs defaultValue="7">
            <CardHeader
              titleId="h-insight"
              title="Minggu ini"
              action={
                <TabsList label="Periode">
                  <TabsTrigger value="7">7 hari</TabsTrigger>
                  <TabsTrigger value="30">30 hari</TabsTrigger>
                </TabsList>
              }
            />
            <TabsContent value="7" className="mt-6">
              <p className="max-w-[30ch] font-display text-[1.625rem] leading-[1.3] text-fg-1 max-sm:text-[1.375rem]">
                Harimu terasa lebih ringan setiap kali kamu tidur lebih dari 7 jam.
              </p>
            </TabsContent>
            <TabsContent value="30" className="mt-6">
              <p className="max-w-[30ch] font-display text-[1.625rem] leading-[1.3] text-fg-1 max-sm:text-[1.375rem]">
                Dalam 30 hari terakhir, kamu check-in 24 kali.
              </p>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="grid gap-5">
          <Card as="section" aria-labelledby="h-skrining">
            <CardHeader
              titleId="h-skrining"
              title="Skrining terakhir"
              action={<span className="meta">PHQ-9, 6 Okt</span>}
            />
            <div className="mt-1 mb-3 flex items-baseline gap-2.5">
              <b className="font-display text-[3.5rem] leading-none font-normal text-fg-1 num">
                11
              </b>
              <span className="text-sm text-fg-4">dari 27</span>
              <CategoryBadge category="moderate" />
            </div>
            <p className="body-m">
              Turun 3 poin dari bulan lalu. Skrining berikutnya disarankan 20 Oktober.
            </p>
            <Button href="/dev/ui" variant="secondary" size="sm" block className="mt-4">
              Lihat riwayat skrining
            </Button>
          </Card>

          <Card as="section" aria-labelledby="h-izin">
            <CardHeader
              titleId="h-izin"
              title="Yang menemanimu"
              action={<span className="meta">Atur izin</span>}
            />
            <ul className="grid gap-0">
              <li className="flex items-center gap-3 pb-3">
                <Avatar name="Rina Sari, M.Psi." tone="biru" />
                <p className="text-sm leading-tight font-semibold text-fg-1">
                  Rina Sari, M.Psi.
                  <small className="block text-[0.8125rem] font-normal text-fg-4">Psikolog</small>
                </p>
                <Badge tone="sage" className="ml-auto">
                  Izin aktif
                </Badge>
              </li>
              <li className="flex items-center gap-3 border-t border-line-soft pt-3">
                <Avatar name="Ibu" />
                <p className="text-sm leading-tight font-semibold text-fg-1">
                  Ibu
                  <small className="block text-[0.8125rem] font-normal text-fg-4">
                    Pendamping, hanya mood
                  </small>
                </p>
                <Badge tone="sage" className="ml-auto">
                  Izin aktif
                </Badge>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
