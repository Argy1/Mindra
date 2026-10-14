import type { ScoreTrend } from '@/lib/domain/psychologist/summary';

interface TrendLineProps {
  /** Skor urut LAMA → BARU. */
  scores: readonly number[];
  trend: ScoreTrend;
  /** Nama instrumen untuk pembaca layar, mis. "PHQ-9". */
  instrument: string;
}

const WIDTH = 72;
const HEIGHT = 24;
const PAD = 3;

const TREND_WORD: Readonly<Record<ScoreTrend, string>> = {
  worse: 'naik',
  better: 'turun',
  stable: 'stabil',
  none: 'belum cukup data',
};

const TREND_COLOR: Readonly<Record<ScoreTrend, string>> = {
  worse: 'var(--danger-500)',
  better: 'var(--sage-600)',
  stable: 'var(--border-control)',
  none: 'var(--border-control)',
};

/**
 * Garis tren skor kecil untuk tabel klien (design/psikolog-dashboard.html). Skor lebih tinggi = lebih
 * berat = garis lebih ke atas. Makna tidak bergantung pada warna: label gambar selalu menyebut skornya
 * dan arah trennya ("naik", "turun", "stabil").
 */
export function TrendLine({ scores, trend, instrument }: TrendLineProps) {
  if (scores.length < 2) {
    return (
      <span className="text-sm text-fg-4">
        –<span className="sr-only"> Belum cukup data untuk tren {instrument}</span>
      </span>
    );
  }

  const low = Math.min(...scores);
  const span = Math.max(Math.max(...scores) - low, 1);
  const step = (WIDTH - PAD * 2) / (scores.length - 1);
  const points = scores
    .map(
      (score, index) =>
        `${(PAD + index * step).toFixed(1)},${(HEIGHT - PAD - ((score - low) / span) * (HEIGHT - PAD * 2)).toFixed(1)}`,
    )
    .join(' ');

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Tren skor ${instrument}: ${scores.join(', ')}, ${TREND_WORD[trend]}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={TREND_COLOR[trend]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
