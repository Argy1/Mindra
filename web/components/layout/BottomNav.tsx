import Link from 'next/link';
import type { NavItemDef } from '@/components/layout/nav-config';
import { isActivePath } from '@/lib/utils/navigation';
import { cn } from '@/lib/utils/cn';

interface BottomNavProps {
  items: NavItemDef[];
  currentPath: string;
}

/** Navigasi bawah, hanya tampil ≤ 960px (design/ui.css `.bottom-nav`). */
export function BottomNav({ items, currentPath }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigasi utama"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line-soft bg-raised px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shell:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = isActivePath(item.href, currentPath, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'grid min-h-[3.25rem] content-center justify-items-center gap-0.5 rounded-md text-[0.6875rem] font-semibold',
              // fg-3 (bukan fg-4 seperti mockup): label 11px butuh kontras ≥ 4,5:1.
              'text-fg-3 no-underline aria-[current=page]:text-biru-700',
            )}
          >
            <Icon aria-hidden weight={active ? 'fill' : 'regular'} className="size-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
