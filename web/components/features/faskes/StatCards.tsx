import { ArrowDownRight, ArrowUpRight, Equals } from '@phosphor-icons/react/ssr';
import { weekRangeLabel, type DashboardView, type Metric } from '@/lib/domain/faskes/dashboard';
import { cn } from '@/lib/utils/cn';
import { formatDecimalId } from '@/lib/utils/date';

const number = new Intl.NumberFormat('id-ID');

interface Delta {
  text: string;
  /** `worse`/`better` hanya untuk metrik yang naik berarti lebih berat; jumlah pengguna netral. */
  tone: 'worse' | 'better' | 'neutral';
  direction: 'up' | 'down' | 'flat';
}

export interface CardSpec {
  label: string;
  /** Periode yang dipakai angka kartu: satu pekan atau seluruh periode terpilih. Selalu tertulis. */
  period: string;
  value: string;
  delta: Delta | null;
  hint?: string;
}

function describeDelta(
  metric: Metric,
  format: (absolute: number) => string,
  upIsWorse: boolean,
  unit: string,
): Delta | null {
  if (metric.delta === null) return null;
  if (metric.delta === 0) {
    return { text: 'sama seperti pekan sebelumnya', tone: 'neutral', direction: 'flat' };
  }
  const up = metric.delta > 0;
  return {
    text: `${up ? 'naik' : 'turun'} ${format(Math.abs(metric.delta))}${unit} dibanding pekan sebelumnya`,
    direction: up ? 'up' : 'down',
    tone: upIsWorse ? (up ? 'worse' : 'better') : 'neutral',
  };
}

const HIDDEN = 'belum tampil (kurang dari 10 pengguna aktif)';

/**
 * Tiga kartu pertama memakai SATU pekan lengkap terakhir (dan deltanya dibanding pekan sebelumnya); kartu krisis
 * menjumlah seluruh periode. `periodLabel` = "12 minggu" dst. Tiap kartu menulis periodenya sendiri supaya
 * angka kartu dan angka "Dibanding kota lain" (rata-rata periode) tidak terbaca sebagai angka yang sama.
 */
export function buildStatCards(summary: DashboardView['summary'], periodLabel: string): CardSpec[] {
  const { activeUsers, avgPhq9, severeShare, crisisAlerts } = summary;
  const week = summary.weekStart ? `pekan ${weekRangeLabel(summary.weekStart)}` : 'pekan terakhir';
  return [
    {
      label: 'warga aktif',
      period: week,
      value: activeUsers.value === null ? '—' : number.format(activeUsers.value),
      delta: describeDelta(activeUsers, (value) => number.format(value), false, ' orang'),
      hint: activeUsers.value === null ? HIDDEN : undefined,
    },
    {
      label: 'rata-rata skor PHQ-9',
      period: week,
      value: avgPhq9.value === null ? '—' : formatDecimalId(avgPhq9.value),
      delta: describeDelta(avgPhq9, (value) => formatDecimalId(value), true, ' poin'),
      hint: avgPhq9.value === null ? HIDDEN : undefined,
    },
    {
      label: 'skor sedang atau berat',
      period: week,
      value: severeShare.value === null ? '—' : `${severeShare.value}%`,
      delta: describeDelta(severeShare, (value) => String(value), true, ' poin'),
      hint: severeShare.value === null ? HIDDEN : undefined,
    },
    {
      label: 'peringatan krisis',
      period: `${periodLabel} terakhir`,
      value: crisisAlerts === null ? '—' : number.format(crisisAlerts),
      delta: null,
      hint: crisisAlerts === null ? HIDDEN : 'jumlah gabungan, bukan data perorangan',
    },
  ];
}

const TONE_CLASS = {
  worse: 'text-warning-700',
  better: 'text-success-700',
  neutral: 'text-fg-3',
} as const;

/**
 * Empat kartu ringkasan (design/faskes-dashboard.html `.stats`). Arah panah dan kata ("naik", "turun")
 * membawa makna; warna hanya penguat.
 */
export function StatCards({
  summary,
  periodLabel,
}: {
  summary: DashboardView['summary'];
  periodLabel: string;
}) {
  const cards = buildStatCards(summary, periodLabel);
  return (
    <dl className="mb-5 grid grid-cols-1 gap-4 min-[30rem]:grid-cols-2 wide:grid-cols-4">
      {cards.map((card) => {
        const Arrow =
          card.delta?.direction === 'up'
            ? ArrowUpRight
            : card.delta?.direction === 'down'
              ? ArrowDownRight
              : Equals;
        return (
          <div
            key={card.label}
            className="flex flex-col-reverse rounded-lg bg-raised px-5 py-4 shadow-xs"
          >
            <dt className="text-sm text-fg-3">
              {card.label}
              <span className="block text-[0.8125rem] text-fg-3">{card.period}</span>
            </dt>
            <dd className="grid gap-1">
              <span className="font-display text-[2.5rem] leading-[1.1] text-fg-1 num">
                {card.value}
              </span>
              {card.delta ? (
                <span
                  className={cn(
                    'flex items-center gap-1 text-[0.8125rem] font-semibold',
                    TONE_CLASS[card.delta.tone],
                  )}
                >
                  <Arrow aria-hidden className="size-4 flex-none" />
                  {card.delta.text}
                </span>
              ) : card.hint ? (
                <span className="text-[0.8125rem] text-fg-3">{card.hint}</span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
