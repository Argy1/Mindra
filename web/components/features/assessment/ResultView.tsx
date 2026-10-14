import { ScoreScale } from '@/components/features/assessment/ScoreScale';
import { ScoreSparkline } from '@/components/features/assessment/ScoreSparkline';
import { RecommendationList } from '@/components/features/assessment/RecommendationList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CrisisBanner } from '@/components/ui/CrisisBanner';
import { getInstrument, type InstrumentId } from '@/lib/domain/assessment/instruments';
import { recommendationsFor } from '@/lib/domain/assessment/recommendations';
import { explanationFor, headlineFor, maxScoreFor, tierFor } from '@/lib/domain/assessment/scoring';
import { formatDateId } from '@/lib/utils/date';

export interface ResultHistoryPoint {
  score: number;
  /** ISO. */
  completedAt: string;
}

interface ResultViewProps {
  instrumentId: InstrumentId;
  score: number;
  /** ISO. */
  completedAt: string;
  /** Hasil detektor krisis atas jawaban tersimpan (PHQ-9 butir 9, SRQ-20 butir 17). */
  crisis: boolean;
  /** Riwayat instrumen ini urut LAMA → BARU, termasuk hasil yang sedang dilihat. */
  history: readonly ResultHistoryPoint[];
}

const CRISIS_LEAD: Partial<Record<InstrumentId, string>> = {
  phq9: 'Kamu menjawab pernah terpikir bahwa lebih baik mati, atau ingin menyakiti diri.',
  srq20: 'Kamu menjawab pernah mempunyai pikiran untuk mengakhiri hidup.',
};

/** "Turun 3 poin dari skrining sebelumnya." Netral: tidak menilai baik atau buruk. */
function deltaSentence(history: readonly ResultHistoryPoint[]): string | null {
  if (history.length < 2) return null;
  const now = history[history.length - 1]!.score;
  const before = history[history.length - 2]!.score;
  const diff = now - before;
  if (diff === 0) return 'Skornya sama dengan skrining sebelumnya.';
  return `${diff < 0 ? 'Turun' : 'Naik'} ${Math.abs(diff)} poin dari skrining sebelumnya.`;
}

/**
 * Halaman hasil skrining (design/app-asesmen.html state 2). Komponen presentasi murni: semua angka
 * dan teks diturunkan dari skor lewat lib/domain/assessment. Banner krisis HANYA muncul bila `crisis`,
 * memakai role="alert", dan menerima fokus saat halaman dimuat.
 */
export function ResultView({ instrumentId, score, completedAt, crisis, history }: ResultViewProps) {
  const instrument = getInstrument(instrumentId);
  const tier = tierFor(instrumentId, score);
  const max = maxScoreFor(instrumentId);
  const delta = deltaSentence(history);
  const date = formatDateId(new Date(completedAt), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto grid max-w-[880px] gap-5 pt-4">
      {crisis ? (
        <CrisisBanner title="Kamu tidak harus menghadapinya sendirian.">
          <p>
            {CRISIS_LEAD[instrumentId]} Itu tanda kamu sedang memikul hal yang sangat berat. Bicara
            dengan seseorang sekarang bisa membantu.
          </p>
        </CrisisBanner>
      ) : null}

      <Card as="section" hero aria-labelledby="judul-hasil">
        <p className="meta">
          {instrument.name} · {date}
        </p>
        <div className="mt-3 grid items-center gap-3 sm:grid-cols-[auto_1fr] sm:gap-8">
          <div>
            <p className="font-display text-[4.5rem] leading-[0.9] font-normal text-fg-1 sm:text-[6rem]">
              <span className="sr-only">Skor kamu: </span>
              <span className="num">{score}</span>
            </p>
            <p className="mt-1.5 text-fg-4">dari {max}</p>
          </div>
          <div>
            <h1 id="judul-hasil" className="display-3">
              {headlineFor(instrumentId, score)}
            </h1>
            <ScoreScale className="mt-4" instrumentId={instrumentId} tier={tier} />
          </div>
        </div>

        <p className="mt-6 lead">{explanationFor(instrumentId, score)}</p>

        <Alert tone="note" compact className="mt-5">
          <p className="body-m">
            Ini hasil skrining, bukan diagnosis. Hanya psikolog atau psikiater yang bisa menegakkan
            diagnosis.
          </p>
        </Alert>
      </Card>

      <div className="grid gap-5 wide:grid-cols-2">
        <Card as="section" aria-labelledby="judul-langkah">
          <h2 id="judul-langkah" className="mb-3 h3">
            Langkah yang bisa kamu coba
          </h2>
          <RecommendationList items={recommendationsFor(instrumentId, score)} />
        </Card>

        <Card as="section" aria-labelledby="judul-perkembangan">
          <h2 id="judul-perkembangan" className="mb-3 h3">
            Perkembanganmu
          </h2>
          {history.length >= 2 ? (
            <>
              <p className="body-m">{delta}</p>
              <ScoreSparkline
                className="mt-4"
                scores={history.map((point) => point.score)}
                label={`Tren skor ${instrument.name}: ${history.map((point) => point.score).join(', ')}`}
              />
            </>
          ) : (
            <p className="body-m">
              Ini skrining {instrument.name} pertamamu. Ulangi dalam dua minggu untuk melihat
              bagaimana perkembanganmu.
            </p>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button href="/beranda">Kembali ke beranda</Button>
        <Button variant="ghost" href="/asesmen">
          Lihat skrining lainnya
        </Button>
      </div>
    </div>
  );
}
