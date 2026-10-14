import { CopyButton } from '@/components/features/developers/CopyButton';

interface CodeBlockProps {
  /** Nama untuk pembaca layar, mis. "Contoh curl". */
  label: string;
  code: string;
  /** Tampilkan tombol salin (butuh JavaScript; teks tetap bisa dipilih tanpa itu). */
  copyable?: boolean;
}

/**
 * Blok kode. `tabIndex=0` + `role="group"` supaya area yang bisa digulir ke samping dapat dijangkau
 * keyboard (aturan axe `scrollable-region-focusable`) dan punya nama yang jelas bagi pembaca layar.
 */
export function CodeBlock({ label, code, copyable = true }: CodeBlockProps) {
  return (
    <div className="relative rounded-md bg-neutral-900 text-neutral-50">
      <pre
        role="group"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto px-4 py-3.5 pr-20 font-mono text-[0.8125rem] leading-relaxed"
      >
        <code>{code}</code>
      </pre>
      {copyable ? <CopyButton text={code} label={label} /> : null}
    </div>
  );
}
