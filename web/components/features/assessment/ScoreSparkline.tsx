import { cn } from '@/lib/utils/cn';

interface ScoreSparklineProps {
  /** Skor urut LAMA → BARU. Butuh minimal dua titik; kurang dari itu tidak menggambar apa pun. */
  scores: readonly number[];
  /** Wajib: ringkasan teks tren, mis. "Tren skor PHQ-9: 16, 14, 14, 11". */
  label: string;
  className?: string;
}

const WIDTH = 280;
const HEIGHT = 56;
const PAD_X = 10;
const TOP = 8;
const BOTTOM = 48;

/** Garis tren kecil (design/app-beranda.html `.spark`). Titik terakhir diisi dan sedikit lebih besar. */
export function ScoreSparkline({ scores, label, className }: ScoreSparklineProps) {
  if (scores.length < 2) return null;

  const low = Math.min(...scores);
  const span = Math.max(Math.max(...scores) - low, 1);
  const step = (WIDTH - PAD_X * 2) / (scores.length - 1);
  const points = scores.map((score, index) => ({
    x: PAD_X + index * step,
    // Skor lebih tinggi = lebih ke atas.
    y: BOTTOM - ((score - low) / span) * (BOTTOM - TOP),
  }));
  const last = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className={cn('w-full', className)}
    >
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="var(--biru-400)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={index === last ? 5 : 4}
          fill={index === last ? 'var(--biru-500)' : 'var(--surface-raised)'}
          stroke="var(--biru-500)"
          strokeWidth={2.5}
        />
      ))}
    </svg>
  );
}
