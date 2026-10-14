import type { FieldRow } from '@/lib/api/docs';

/** Tabel kolom permintaan/parameter. Area geser punya `tabIndex` dan nama supaya dapat dijangkau keyboard. */
export function FieldTable({ caption, rows }: { caption: string; rows: readonly FieldRow[] }) {
  if (rows.length === 0) return null;
  const head = 'px-3 pb-2 text-left text-xs font-semibold text-fg-4';
  const cell = 'border-t border-line-soft px-3 py-2.5 align-top text-sm';

  return (
    <div role="group" aria-label={caption} tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={head}>
              Nama
            </th>
            <th scope="col" className={head}>
              Tipe
            </th>
            <th scope="col" className={head}>
              Wajib
            </th>
            <th scope="col" className={head}>
              Keterangan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path}>
              <th scope="row" className={`${cell} text-left font-mono font-semibold text-fg-1`}>
                {row.path}
              </th>
              <td className={`${cell} font-mono text-fg-2`}>{row.type}</td>
              <td className={cell}>{row.required ? 'ya' : 'tidak'}</td>
              <td className={`${cell} text-fg-2`}>
                {row.description}
                {row.constraints ? (
                  <span className="block text-[0.8125rem] text-fg-3">{row.constraints}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
