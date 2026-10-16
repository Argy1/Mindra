import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { HelpButton } from '@/components/layout/HelpButton';
import { Logo } from '@/components/layout/Logo';
import type { NavItemDef, RoleNavDef } from '@/components/layout/nav-config';
import { isActivePath } from '@/lib/utils/navigation';
import { cn } from '@/lib/utils/cn';

export interface ShellUser {
  name: string;
  /** Teks di bawah nama, mis. "Pengguna" atau "Psikolog klinis". */
  roleLabel: string;
}

/** Lencana angka di item navigasi, mis. peringatan krisis terbuka. Kunci = href item. */
export type ShellBadges = Partial<Record<string, { count: number; label: string }>>;

interface SidebarProps {
  nav: RoleNavDef;
  currentPath: string;
  user: ShellUser;
  badges?: ShellBadges;
}

/** Sidebar 256px, hanya tampil ≥ 961px (design/ui.css `.sidebar`). Di bawahnya: <BottomNav>. */
export function Sidebar({ nav, currentPath, user, badges }: SidebarProps) {
  return (
    // <aside> = landmark "complementary": logo, navigasi, dan blok pengguna semuanya berada
    // di dalam landmark (aturan axe `region`).
    <aside
      aria-label="Bilah samping"
      className="sticky top-0 hidden h-dvh flex-col gap-1 overflow-x-hidden overflow-y-auto border-r border-line-soft bg-raised px-4 py-6 shell:flex"
    >
      <Link
        href={nav.homeHref}
        aria-label="Mindra, ke beranda"
        className="mb-6 inline-block self-start rounded-md px-3 py-1"
      >
        <Logo size="md" />
      </Link>

      <nav aria-label="Navigasi utama">
        {nav.groups.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label ? (
              <p className="mt-5 px-3 pb-1.5 text-xs font-semibold text-fg-4">{group.label}</p>
            ) : null}
            <ul className="grid gap-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} currentPath={currentPath} badge={badges?.[item.href]} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto grid gap-3 pt-6">
        {nav.showHelp ? <HelpButton variant="sidebar" /> : null}
        <div className="flex items-center gap-2.5 border-t border-line-soft px-2 pt-4">
          <Avatar name={user.name} tone="biru" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p title={user.name} className="truncate text-sm leading-tight font-semibold text-fg-1">
              {user.name}
            </p>
            <p className="truncate meta">{user.roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  currentPath,
  badge,
}: {
  item: NavItemDef;
  currentPath: string;
  badge: { count: number; label: string } | undefined;
}) {
  const active = isActivePath(item.href, currentPath, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-medium text-fg-3 no-underline',
        'transition-colors duration-(--dur-fast) hover:bg-sunken hover:text-fg-1',
        'aria-[current=page]:bg-biru-50 aria-[current=page]:font-semibold aria-[current=page]:text-biru-700',
      )}
    >
      <Icon aria-hidden className="size-[1.375rem] shrink-0" />
      {item.label}
      {badge && badge.count > 0 ? (
        <span className="ml-auto grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-pill bg-danger-500 px-1.5 text-xs font-bold text-white">
          <span aria-hidden>{badge.count}</span>
          <span className="sr-only">
            {badge.count} {badge.label}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
