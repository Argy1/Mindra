import type { Metadata } from 'next';
import { InstrumentCard } from '@/components/features/assessment/InstrumentCard';
import { Alert } from '@/components/ui/Alert';
import { INSTRUMENT_LIST } from '@/lib/domain/assessment/instruments';
import { getLatestPerInstrument } from '@/lib/server/assessments';

export const metadata: Metadata = { title: 'Cek perasaan' };

export default async function AssessmentListPage() {
  const latest = await getLatestPerInstrument();

  return (
    <div className="pt-4">
      <h1 className="display-3">Cek perasaan</h1>
      <p className="mt-1.5 lead max-w-[60ch]">
        Pilih skrining yang ingin kamu isi. Tidak ada jawaban benar atau salah, dan kamu bisa
        berhenti kapan saja.
      </p>

      <Alert tone="note" compact className="mt-5 max-w-[60ch]">
        <p className="body-m">
          Skrining membantu mengenali kondisimu, bukan menegakkan diagnosis. Hasilnya hanya bisa
          dilihat olehmu, kecuali kamu memberi izin ke orang lain.
        </p>
      </Alert>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {INSTRUMENT_LIST.map((instrument) => {
          const last = latest[instrument.id];
          return (
            <InstrumentCard
              key={instrument.id}
              instrument={instrument}
              last={
                last
                  ? {
                      id: last.id,
                      score: last.score,
                      category: last.category,
                      completedAt: last.completedAt,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
