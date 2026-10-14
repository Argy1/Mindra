'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { CheckCircle, DeviceMobile, WarningCircle } from '@phosphor-icons/react/ssr';
import { AcknowledgeAlertForm } from '@/components/features/psychologist/AcknowledgeAlertForm';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
  formatAlertTime,
  parseRealtimePayload,
  pendingAlertFromRow,
  sourceLabel,
  type AlertItem,
} from '@/lib/domain/psychologist/alerts';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface LiveCrisisPanelProps {
  /** Peringatan terbuka dari server (sudah melewati RLS, izin klien, dan jejak audit). */
  alerts: readonly AlertItem[];
  /** Klien yang mengizinkan peringatan krisis; dipakai menamai peringatan yang tiba lewat realtime. */
  watchedClients: readonly { patientId: string; name: string }[];
  /** Kunci tanggal WIB hari ini dari server (supaya format waktu server dan klien sama). */
  today: string;
  /** Pabrik klien realtime. Bawaannya klien Supabase browser; tes dan pratinjau memberi klien palsu. */
  createRealtimeClient?: typeof createClient;
}

type Connection = 'connecting' | 'live' | 'offline';

const POLL_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 400;

const SEVERITY_LABEL = { critical: 'Kritis', high: 'Tinggi' } as const;

const STATUS_TEXT: Readonly<Record<Connection, string>> = {
  connecting: 'Menghubungkan',
  live: 'Terhubung langsung',
  offline: 'Koneksi langsung terputus, halaman dimuat ulang tiap 30 detik',
};

function beep(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);
}

/**
 * Panel peringatan krisis realtime (design/psikolog-dashboard.html `.crisis-card`).
 *
 * Alur saat ada peringatan baru, tanpa memuat ulang halaman:
 *   1. Supabase Realtime mengirim baris `crisis_alerts` baru. Realtime menerapkan RLS milik sesi ini,
 *      jadi psikolog hanya menerima peringatan klien yang berizin (dan hanya bila sesinya aal2).
 *   2. Payload divalidasi Zod; kartu sementara tampil seketika dan diumumkan ke pembaca layar.
 *   3. `router.refresh()` memuat rincian dari server. Di sanalah akses DICATAT ke jejak audit sebelum
 *      datanya dibaca; kartu sementara digantikan kartu lengkap.
 * Bila koneksi langsung putus, halaman dimuat ulang tiap 30 detik dan saat tab kembali terlihat.
 */
export function LiveCrisisPanel({
  alerts,
  watchedClients,
  today,
  createRealtimeClient = createClient,
}: LiveCrisisPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [connection, setConnection] = useState<Connection>('connecting');
  const [incoming, setIncoming] = useState<AlertItem[]>([]);
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const [soundOn, setSoundOn] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const namesRef = useRef<ReadonlyMap<string, string>>(new Map());

  const nameById = useMemo(
    () => new Map(watchedClients.map((client) => [client.patientId, client.name])),
    [watchedClients],
  );
  useEffect(() => {
    namesRef.current = nameById;
  }, [nameById]);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const visible = useMemo(() => {
    const known = new Set(alerts.map((alert) => alert.id));
    return [...incoming.filter((alert) => !known.has(alert.id)), ...alerts].filter(
      (alert) => !handled.has(alert.id),
    );
  }, [alerts, incoming, handled]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createRealtimeClient();
    } catch {
      // Tanpa konfigurasi Supabase di browser tidak ada koneksi langsung; polling tetap berjalan.
      queueMicrotask(() => {
        if (!cancelled) setConnection('offline');
      });
      return () => {
        cancelled = true;
      };
    }

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => startTransition(() => router.refresh()), REFRESH_DEBOUNCE_MS);
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel('psikolog-crisis-alerts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crisis_alerts' },
          (payload) => {
            const parsed = parseRealtimePayload(payload);
            if (!parsed) return;
            const { row } = parsed;

            if (row.status !== 'open') {
              setIncoming((list) => list.filter((alert) => alert.id !== row.id));
              scheduleRefresh();
              return;
            }
            const pending = pendingAlertFromRow(row, namesRef.current);
            if (pending) {
              setIncoming((list) =>
                list.some((alert) => alert.id === pending.id) ? list : [pending, ...list],
              );
              if (parsed.eventType === 'INSERT') {
                setAnnouncement(`Peringatan krisis baru dari ${pending.patientName}.`);
                if (soundRef.current && audioRef.current) beep(audioRef.current);
              }
            }
            scheduleRefresh();
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') setConnection('live');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnection('offline');
          }
        });
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [createRealtimeClient, router]);

  // Cadangan bila koneksi langsung tidak ada: muat ulang berkala.
  useEffect(() => {
    if (connection === 'live') return;
    const id = setInterval(() => startTransition(() => router.refresh()), POLL_MS);
    return () => clearInterval(id);
  }, [connection, router]);

  // Kembali ke tab ini setelah lama di tempat lain: pastikan daftar terbaru.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  function toggleSound(next: boolean) {
    setSoundOn(next);
    if (!next || typeof AudioContext === 'undefined') return;
    // Konteks audio hanya boleh dibuat setelah gestur pengguna (kebijakan autoplay browser).
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume().then(() => {
      if (audioRef.current) beep(audioRef.current);
    });
  }

  function markHandled(id: string) {
    setHandled((previous) => new Set(previous).add(id));
    setIncoming((list) => list.filter((alert) => alert.id !== id));
  }

  const open = visible.length > 0;

  return (
    <section aria-labelledby="h-krisis" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p
          aria-live="polite"
          className={cn(
            'inline-flex items-center gap-2 text-[0.8125rem] font-semibold',
            connection === 'live' ? 'text-sage-700' : 'text-fg-3',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'size-2 rounded-full',
              connection === 'live'
                ? 'bg-sage-500 shadow-[0_0_0_4px_var(--sage-100)]'
                : 'bg-neutral-400',
            )}
          />
          {STATUS_TEXT[connection]}
        </p>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-[0.8125rem] text-fg-3">
            Bunyi saat ada peringatan baru
          </span>
          <Switch
            label="Bunyi saat ada peringatan krisis baru"
            checked={soundOn}
            onCheckedChange={toggleSound}
          />
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl bg-raised shadow-md',
          open ? 'border-[1.5px] border-danger-200' : 'border border-line-soft',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 px-6 py-3 text-sm font-bold',
            open ? 'bg-danger-50 text-danger-700' : 'bg-sunken text-fg-2',
          )}
        >
          <WarningCircle aria-hidden weight="duotone" className="size-5" />
          <h2 id="h-krisis" className="text-sm font-bold">
            {open ? 'Peringatan krisis, perlu ditindaklanjuti' : 'Peringatan krisis'}
          </h2>
          <span className="ml-auto font-medium">{visible.length} terbuka</span>
        </div>

        {open ? (
          <ul>
            {visible.map((alert) => (
              <li
                key={alert.id}
                data-alert-id={alert.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-danger-100 px-6 py-5 first:border-t-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <Avatar name={alert.patientName} tone="matahari" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong className="text-base text-fg-1">{alert.patientName}</strong>
                    <Badge tone="severe">{SEVERITY_LABEL[alert.severity]}</Badge>
                  </p>
                  <p className="mt-0.5 text-sm text-fg-2">{alert.reason}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 meta">
                    <DeviceMobile aria-hidden className="size-4" />
                    {sourceLabel(alert.source)}, {formatAlertTime(alert.createdAt, today)}
                  </p>
                </div>
                <div className="col-span-full flex flex-wrap items-start gap-2 sm:col-span-1 sm:justify-end">
                  <Button size="sm" variant="secondary" href={`/psikolog/klien/${alert.patientId}`}>
                    Buka profil
                    <span className="sr-only"> {alert.patientName}</span>
                  </Button>
                  <AcknowledgeAlertForm
                    id={alert.id}
                    patientName={alert.patientName}
                    onHandled={markHandled}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-3 px-6 py-5 body-m">
            <CheckCircle aria-hidden weight="duotone" className="size-6 shrink-0 text-sage-600" />
            Tidak ada peringatan krisis yang terbuka. Peringatan baru muncul di sini seketika.
          </p>
        )}
      </div>

      {/* Pengumuman untuk pembaca layar; tidak mencuri fokus. */}
      <div role="alert" className="sr-only">
        {announcement}
      </div>
    </section>
  );
}
