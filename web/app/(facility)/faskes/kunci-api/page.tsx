import type { Metadata } from 'next';
import { ApiKeyManager } from '@/components/features/faskes/ApiKeyManager';
import { requireMfaFacilityAdmin } from '@/lib/auth/mfa-server';
import { getApiKeyOverview } from '@/lib/server/faskes';

export const metadata: Metadata = { title: 'Kunci API' };

export default async function KunciApiPage() {
  const profile = await requireMfaFacilityAdmin();
  const overview = await getApiKeyOverview(profile.id);
  return <ApiKeyManager overview={overview} />;
}
