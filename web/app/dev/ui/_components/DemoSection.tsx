import type { ReactNode } from 'react';

interface DemoSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Satu bagian di katalog komponen: judul, penjelasan, lalu contoh. */
export function DemoSection({ id, title, description, children }: DemoSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-judul`}
      className="scroll-mt-6 border-t border-line-soft py-10"
    >
      <h2 id={`${id}-judul`} className="display-3">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-[65ch] body-m">{description}</p> : null}
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

/** Baris contoh berlabel kecil, supaya variasi mudah dibandingkan. */
export function DemoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="meta">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
