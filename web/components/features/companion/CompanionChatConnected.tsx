'use client';

import { useMemo, type ComponentProps } from 'react';
import { CompanionChat } from '@/components/features/companion/CompanionChat';
import { createFetchTransport } from '@/lib/companion/client';
import { createClient } from '@/lib/supabase/client';

/**
 * CompanionChat yang tersambung ke API sungguhan. Token akses diambil dari sesi Supabase di peramban dan dikirim
 * sebagai Bearer, jadi web memakai API publik yang sama dengan klien lain (tidak ada jalur khusus).
 */
export function CompanionChatConnected(
  props: Omit<ComponentProps<typeof CompanionChat>, 'transport'>,
) {
  const transport = useMemo(
    () =>
      createFetchTransport(async () => {
        const { data } = await createClient().auth.getSession();
        return data.session?.access_token ?? null;
      }),
    [],
  );
  return <CompanionChat {...props} transport={transport} />;
}
