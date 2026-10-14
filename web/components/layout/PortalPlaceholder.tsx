import { Hourglass } from '@phosphor-icons/react/ssr';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireRole } from '@/lib/auth/session';
import type { UserRole } from '@/lib/auth/roles';

interface PortalPlaceholderProps {
  role: UserRole;
  /** Judul halaman, mis. "Beranda". */
  title: string;
}

/**
 * Halaman sementara untuk portal yang fiturnya belum dibangun, supaya alur masuk → portal sesuai
 * peran bisa diuji ujung ke ujung. Diganti halaman sungguhan di fase terkait (docs/PLAN.md).
 */
export async function PortalPlaceholder({ role, title }: PortalPlaceholderProps) {
  const profile = await requireRole(role);

  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-7">
        <h1 id="judul" className="display-3">
          Halo, {profile.name}.
        </h1>
        <p className="mt-1.5 lead">{title}</p>
      </section>
      <EmptyState
        icon={<Hourglass />}
        title="Halaman ini belum tersedia"
        description="Kami sedang membangunnya. Akunmu sudah aktif dan berperan sebagai yang kamu pilih."
        headingLevel="h2"
      />
    </>
  );
}
