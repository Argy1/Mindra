import type { Metadata } from 'next';
import { AdminQueueView } from '@/components/features/admin/AdminQueueView';
import { requireMfaAdmin } from '@/lib/auth/mfa-server';
import { getPendingPsychologists, getReviewHistory } from '@/lib/server/admin';

export const metadata: Metadata = { title: 'Antrean psikolog' };

export default async function AdminPage() {
  await requireMfaAdmin();
  const [pending, history] = await Promise.all([getPendingPsychologists(), getReviewHistory()]);
  return <AdminQueueView pending={pending} history={history} />;
}
