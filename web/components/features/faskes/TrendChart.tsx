import { weekRangeLabel, weekShortLabel, type WeekPoint } from '@/lib/domain/faskes/dashboard';
import { formatDecimalId } from '@/lib/utils/date';

interface SeriesSpec {
  key: 'phq9' | 'gad7';
  name: string;
  color: string;
  dash?: string;
}

const SERIES: readonly SeriesSpec[] = [
  { key: 'phq9', name: 'PHQ-9 (depresi)', color: 'var(--biru-500)' },
  { key: 'gad7', name: 'GAD-7 (kecemasan)', color: 'var(--sage-500)', dash: '7 5' },
];

const STATE_LABEL = {
  shown: 'tampil',
  suppressed: 'disembunyikan (kurang dari 10 pengguna)',
  none: 'tidak ada aktivitas',
} as const;

/** Skala sumbu y: batas bawah/atas bulat dan 4 garis bantu. Tidak selalu mulai dari nol (grafik rata-rata). */
export function yScale(values: readonly number[]): { lo: number; hi: number; ticks: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor(min) - 1);
  const span = Math.max(Math.ceil(max) + 1 - lo, 4);
  const step = Math.ceil(span / 3);
  const hi = lo + step * 3;
  return { lo, hi, ticks: [0, 1, 2, 3].map((index) => lo + index * step) };
}

/** Indeks label sumbu x: paling banyak `max`, selalu termasuk yang pertama dan terakhir. */
export function xTickIndices(count: number, max = 6): number[] {
  if (count <= max) return Array.from({ length: count }, (_, index) => index);
  const step = Math.ceil((count - 1) / (max - 1));
  const indices: number[] = [];
  for (let index = 0; index < count - 1; index += step) indices.push(index);
  const last = count - 1;
  if (last - indices[indices.length - 1]! < step / 2) indices.pop();
  indices.push(last);
  return indices;
}

function describe(weeks: readonly WeekPoint[], spec: SeriesSpec): string | null {
  const points = weeks.flatMap((week) =>
    week[spec.key] === null ? [] : [{ weekStart: week.weekStart, value: week[spec.key]! }],
  );
  if (points.length === 0) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), first);
  const format = (point: { weekStart: string; value: number }) =>
    `${formatDecimalId(point.value)} pada pekan ${weekShortLabel(point.weekStart)}`;
  return `${spec.name}: ${format(first)}, terakhir ${format(last)}, tertinggi ${format(peak)}`;
}

export function chartLabel(weeks: readonly WeekPoint[]): string {
  const parts = SERIES.map((spec) => describe(weeks, spec)).filter((part) => part !== null);
  return `Rata-rata skor per pekan. ${parts.join('. ')}.`;
}

interface Segment {
  indices: number[];
}

function segmentsOf(values: readonly (number | null)[]): Segment[] {
  const segments: Segment[] = [];
  let current: number[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) segments.push({ indices: current });
      current = [];
    } else current.push(index);
  });
  if (current.length > 0) segments.push({ indices: current });
  return segments;
}

function TrendSvg({
  weeks,
  width,
  height,
  maxLabels,
  label,
}: {
  weeks: readonly WeekPoint[];
  width: number;
  height: number;
  /** Jumlah label sumbu x paling banyak; lebih sedikit di layar sempit supaya tidak bertumpuk. */
  maxLabels: number;
  label: string;
}) {
  const left = 36;
  const right = 16;
  const top = 14;
  const bottom = 34;
  const plotW = width - left - right;
  const plotH = height - top - bottom;

  const values = weeks
    .flatMap((week) => [week.phq9, week.gad7])
    .filter((v): v is number => v !== null);
  const { lo, hi, ticks } = yScale(values);
  const xOf = (index: number) =>
    weeks.length === 1 ? left + plotW / 2 : left + (index * plotW) / (weeks.length - 1);
  const yOf = (value: number) => top + (1 - (value - lo) / (hi - lo)) * plotH;
  const showMarkers = weeks.length <= 13;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      <g>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={width - right}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="var(--border-soft)"
            />
            <text
              x={left - 8}
              y={yOf(tick) + 4}
              textAnchor="end"
              style={{ fill: 'var(--fg-4)', fontSize: 12 }}
            >
              {tick}
            </text>
          </g>
        ))}
        {xTickIndices(weeks.length, maxLabels).map((index) => (
          <text
            key={index}
            x={xOf(index)}
            y={height - 10}
            textAnchor={index === 0 ? 'start' : index === weeks.length - 1 ? 'end' : 'middle'}
            style={{ fill: 'var(--fg-4)', fontSize: 12 }}
          >
            {weekShortLabel(weeks[index]!.weekStart)}
          </text>
        ))}
        {SERIES.map((spec) => {
          const column = weeks.map((week) => week[spec.key]);
          const lastIndex = column.reduce<number>(
            (found, value, index) => (value === null ? found : index),
            -1,
          );
          return (
            <g key={spec.key} fill="none" stroke={spec.color}>
              {segmentsOf(column).map((segment) =>
                segment.indices.length > 1 ? (
                  <polyline
                    key={segment.indices[0]}
                    points={segment.indices
                      .map((index) => `${xOf(index).toFixed(1)},${yOf(column[index]!).toFixed(1)}`)
                      .join(' ')}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={spec.dash}
                  />
                ) : null,
              )}
              {column.map((value, index) =>
                value !== null && (showMarkers || index === lastIndex) ? (
                  <circle
                    key={index}
                    cx={xOf(index)}
                    cy={yOf(value)}
                    r={index === lastIndex ? 5 : 3.5}
                    fill={spec.color}
                    stroke="var(--surface-raised)"
                    strokeWidth={1.5}
                  />
                ) : null,
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Grafik rata-rata skor per pekan (design/faskes-dashboard.html). Garis terputus di pekan yang disembunyikan
 * database: tidak diisi dan tidak ditarik lurus melewatinya. Gambar punya label teks yang meringkas isinya, dan
 * seluruh angka tersedia sebagai tabel. Dua ukuran SVG dirender agar teks sumbu tetap terbaca di ponsel.
 */
export function TrendChart({ weeks }: { weeks: readonly WeekPoint[] }) {
  if (!weeks.some((week) => week.phq9 !== null || week.gad7 !== null)) return null;
  const label = chartLabel(weeks);

  return (
    <figure className="m-0">
      <div className="max-sm:hidden">
        <TrendSvg weeks={weeks} width={660} height={240} maxLabels={6} label={label} />
      </div>
      <div className="sm:hidden">
        <TrendSvg weeks={weeks} width={340} height={240} maxLabels={4} label={label} />
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-fg-3">
        {SERIES.map((spec) => (
          <span key={spec.key} className="inline-flex items-center gap-1.5">
            <svg width="22" height="6" aria-hidden>
              <line
                x1="1"
                x2="21"
                y1="3"
                y2="3"
                stroke={spec.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={spec.dash}
              />
            </svg>
            {spec.name}
          </span>
        ))}
        <span>Jeda pada garis berarti pekan itu disembunyikan atau tanpa aktivitas.</span>
      </figcaption>

      <details className="mt-4 rounded-lg bg-sunken px-4 py-3">
        <summary className="cursor-pointer font-semibold text-fg-1">
          Lihat angka sebagai tabel
        </summary>
        <div
          role="group"
          aria-label="Tabel rata-rata skor per pekan"
          tabIndex={0}
          className="mt-3 overflow-x-auto"
        >
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Rata-rata skor per pekan, hanya dari kelompok minimal 10 orang
            </caption>
            <thead>
              <tr>
                {['Pekan', 'PHQ-9', 'GAD-7', 'PSS-10', 'Pengguna aktif', 'Status'].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-2.5 pb-2 text-left text-xs font-semibold text-fg-4"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.weekStart}>
                  <th
                    scope="row"
                    className="border-t border-line-soft px-2.5 py-2 text-left font-medium text-fg-2"
                  >
                    {weekRangeLabel(week.weekStart)}
                  </th>
                  {[week.phq9, week.gad7, week.pss10].map((value, index) => (
                    <td key={index} className="border-t border-line-soft px-2.5 py-2 num">
                      {value === null ? '–' : formatDecimalId(value)}
                    </td>
                  ))}
                  <td className="border-t border-line-soft px-2.5 py-2 num">
                    {week.activeUsers ?? '–'}
                  </td>
                  <td className="border-t border-line-soft px-2.5 py-2 text-fg-3">
                    {STATE_LABEL[week.state]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
