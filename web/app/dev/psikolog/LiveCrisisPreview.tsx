'use client';

import { useRef } from 'react';
import { LiveCrisisPanel } from '@/components/features/psychologist/LiveCrisisPanel';
import { Button } from '@/components/ui/Button';
import type { AlertItem } from '@/lib/domain/psychologist/alerts';
import { createFakeRealtime, type FakeRealtime } from '@/lib/dev/fake-realtime';

interface LiveCrisisPreviewProps {
  alerts: readonly AlertItem[];
  watchedClients: readonly { patientId: string; name: string }[];
  today: string;
  /** Klien yang peringatannya dikirim tombol simulasi. */
  simulateFor: { patientId: string; name: string };
}

/**
 * Pratinjau <LiveCrisisPanel> dengan klien realtime palsu. Tombol "Simulasikan peringatan masuk"
 * mengirim payload `postgres_changes` seperti yang dikirim Supabase, sehingga alur "peringatan baru
 * muncul tanpa memuat ulang halaman" bisa dicoba (dan diuji di Playwright) tanpa login.
 * Hanya dipakai di /dev/psikolog.
 */
export function LiveCrisisPreview({
  alerts,
  watchedClients,
  today,
  simulateFor,
}: LiveCrisisPreviewProps) {
  // Satu klien palsu per pemasangan komponen; ref menjaganya stabil antar render.
  const fakeRef = useRef<FakeRealtime | null>(null);
  if (fakeRef.current === null) fakeRef.current = createFakeRealtime();
  const fake = fakeRef.current;
  const counter = useRef(0);

  function simulate() {
    counter.current += 1;
    const suffix = String(counter.current).padStart(12, '0');
    fake.emit({
      eventType: 'INSERT',
      new: {
        id: `99999999-9999-4999-8999-${suffix}`,
        user_id: simulateFor.patientId,
        severity: 'critical',
        status: 'open',
        source: 'assessment',
        // Jam tetap (hari contoh, 09.31 WIB) supaya tangkapan layar dan tes e2e stabil.
        created_at: `${today}T09:31:00+07:00`,
      },
    });
  }

  return (
    <div className="grid gap-3">
      <div>
        <Button size="sm" variant="secondary" onClick={simulate}>
          Simulasikan peringatan masuk
        </Button>
        <p className="mt-1.5 meta">
          Khusus pratinjau: mengirim payload realtime palsu untuk {simulateFor.name}.
        </p>
      </div>
      <LiveCrisisPanel
        alerts={alerts}
        watchedClients={watchedClients}
        today={today}
        createRealtimeClient={() => fake.client}
      />
    </div>
  );
}
