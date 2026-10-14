import { AssessmentPreview } from '@/app/dev/asesmen/AssessmentPreview';
import { INSTRUMENTS, isInstrumentId } from '@/lib/domain/assessment/instruments';

/**
 * Pratinjau layar pengisian skrining. Pilih instrumen lewat `?tipe=phq9|gad7|pss10|srq20`.
 * Tidak memerlukan login; tidak menyimpan apa pun.
 */
export default async function AssessmentPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string }>;
}) {
  const { tipe } = await searchParams;
  const instrument = INSTRUMENTS[isInstrumentId(tipe) ? tipe : 'phq9'];
  return <AssessmentPreview instrument={instrument} />;
}
