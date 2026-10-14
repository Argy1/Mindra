import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResultView } from '@/components/features/assessment/ResultView';
import { detectAssessmentCrisis } from '@/lib/domain/crisis/detector';
import { getAssessmentById, getAssessmentHistory } from '@/lib/server/assessments';

export const metadata: Metadata = { title: 'Hasil skrining' };

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Baris milik orang lain tidak terbaca oleh RLS, jadi id tebakan sama saja dengan id yang tidak ada.
  const result = await getAssessmentById(id);
  if (!result) notFound();

  const history = await getAssessmentHistory(result.type, 10);
  // Pastikan hasil yang sedang dilihat ada di riwayat (batas 10 terbaru bisa melewatkan hasil lama).
  const points = history.some((item) => item.id === result.id) ? history : [...history, result];

  return (
    <ResultView
      instrumentId={result.type}
      score={result.score}
      completedAt={result.completedAt}
      // Dideteksi ulang dari jawaban tersimpan (sumber kebenaran), bukan dari parameter URL.
      crisis={detectAssessmentCrisis(result.type, result.answers)}
      history={points.map((item) => ({ score: item.score, completedAt: item.completedAt }))}
    />
  );
}
