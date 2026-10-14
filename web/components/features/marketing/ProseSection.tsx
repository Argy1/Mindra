import type { ReactNode } from 'react';

interface ProseSectionProps {
  /** Id judul; juga dipakai sebagai nama bagian untuk pembaca layar dan sebagai jangkar tautan. */
  id: string;
  title: string;
  children: ReactNode;
}

/** Satu bagian pada halaman bacaan (tentang, kebijakan privasi): judul h2 + isi berjarak rapi. */
export function ProseSection({ id, title, children }: ProseSectionProps) {
  return (
    <section aria-labelledby={id} className="mt-12 scroll-mt-6">
      <h2 id={id} className="text-xl font-bold text-fg-1">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 leading-relaxed text-fg-2">{children}</div>
    </section>
  );
}
