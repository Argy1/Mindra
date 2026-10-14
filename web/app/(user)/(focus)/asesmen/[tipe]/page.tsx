import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssessmentRunner } from '@/components/features/assessment/AssessmentRunner';
import { submitAssessmentAction } from '@/lib/assessment/actions';
import { INSTRUMENTS, isInstrumentId } from '@/lib/domain/assessment/instruments';

interface PageProps {
  params: Promise<{ tipe: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tipe } = await params;
  return { title: isInstrumentId(tipe) ? INSTRUMENTS[tipe].title : 'Skrining' };
}

export default async function AssessmentRunnerPage({ params }: PageProps) {
  const { tipe } = await params;
  // "hasil" dan nilai asing lain jatuh ke sini juga (segmen dinamis), jadi tolak yang bukan instrumen.
  if (!isInstrumentId(tipe)) notFound();

  return <AssessmentRunner instrument={INSTRUMENTS[tipe]} onSubmit={submitAssessmentAction} />;
}
