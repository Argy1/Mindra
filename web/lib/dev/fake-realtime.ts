import type { createClient } from '@/lib/supabase/client';

/**
 * Klien Supabase palsu yang hanya meniru bagian Realtime yang dipakai <LiveCrisisPanel>. Dipakai tes
 * unit dan halaman pratinjau /dev/psikolog supaya alur "peringatan baru muncul tanpa memuat ulang"
 * bisa dicoba tanpa login dan tanpa jaringan. TIDAK dipakai di halaman sungguhan.
 */

export interface FakeRealtime {
  /** Klien palsu untuk diberikan ke `createRealtimeClient`. */
  client: ReturnType<typeof createClient>;
  /** Mengirim satu payload `postgres_changes` ke pendengar yang terdaftar. */
  emit: (payload: unknown) => void;
  /** Mengubah status langganan, mis. 'SUBSCRIBED' atau 'CHANNEL_ERROR'. */
  setStatus: (status: string) => void;
  readonly removed: () => number;
}

export function createFakeRealtime(initialStatus: string = 'SUBSCRIBED'): FakeRealtime {
  let onChange: ((payload: unknown) => void) | null = null;
  let onStatus: ((status: string) => void) | null = null;
  let removedCount = 0;

  const channel = {
    on(_type: string, _filter: unknown, callback: (payload: unknown) => void) {
      onChange = callback;
      return channel;
    },
    subscribe(callback: (status: string) => void) {
      onStatus = callback;
      queueMicrotask(() => callback(initialStatus));
      return channel;
    },
  };

  const client = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    realtime: { setAuth: () => undefined },
    channel: () => channel,
    removeChannel: async () => {
      removedCount += 1;
      return 'ok';
    },
  };

  return {
    client: client as unknown as ReturnType<typeof createClient>,
    emit: (payload) => onChange?.(payload),
    setStatus: (status) => onStatus?.(status),
    removed: () => removedCount,
  };
}
