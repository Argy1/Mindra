'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react/ssr';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils/cn';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /**
   * Milidetik sebelum hilang sendiri. `null` = menetap sampai ditutup.
   * Bawaan: 6000, kecuali galat yang menetap (pengguna harus sempat membaca cara memperbaikinya).
   */
  duration?: number | null;
}

interface ToastRecord {
  id: number;
  title: string;
  description: string | undefined;
  tone: ToastTone;
  duration: number | null;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 6000;

/** Panggil `const { toast } = useToast()` di komponen klien mana pun di bawah <ToastProvider>. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast harus dipakai di dalam <ToastProvider>.');
  return context;
}

const TONE_ICON = {
  info: Info,
  success: CheckCircle,
  error: WarningCircle,
} as const;

const TONE_ICON_CLASS: Record<ToastTone, string> = {
  info: 'text-biru-600',
  success: 'text-success-700',
  error: 'text-danger-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    const tone = options.tone ?? 'info';
    const record: ToastRecord = {
      id,
      title: options.title,
      description: options.description,
      tone,
      duration:
        options.duration !== undefined
          ? options.duration
          : tone === 'error'
            ? null
            : DEFAULT_DURATION,
    };
    setToasts((current) => [...current, record].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      {/* Wilayah live yang SELALU ada di DOM: pembaca layar hanya mengumumkan perubahan
          pada wilayah yang sudah terdaftar sebelum isinya muncul. */}
      <div
        role="region"
        aria-label="Notifikasi"
        aria-live="polite"
        aria-relevant="additions text"
        className={cn(
          'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-3 px-4',
          'bottom-4 shell:right-6 shell:bottom-6 shell:left-auto shell:items-end shell:px-0',
          // Di mobile, naikkan di atas bottom nav bila halaman memilikinya.
          '[body:has([data-bottom-nav])_&]:max-shell:bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)]',
        )}
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} record={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({
  record,
  onDismiss,
}: {
  record: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const Icon = TONE_ICON[record.tone];
  const { id, duration } = record;

  // Hentikan hitung mundur saat disorot/difokus agar pengguna sempat membaca.
  useEffect(() => {
    if (duration === null || paused) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, paused, id, onDismiss]);

  return (
    // Handler hover/fokus hanya MENJEDA timer (tidak memicu aksi apa pun), jadi bukan
    // elemen interaktif; kontrol sebenarnya (tombol tutup) sudah native dan bisa difokus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- lihat komentar di atas
    <div
      // Galat memakai role="alert" (diumumkan segera); sisanya cukup status sopan.
      role={record.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-raised p-4 shadow-lg',
        'border border-line-soft motion-safe:animate-toast-in',
      )}
    >
      <Icon
        aria-hidden
        weight="fill"
        className={cn('mt-0.5 size-6 shrink-0', TONE_ICON_CLASS[record.tone])}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg-1">{record.title}</p>
        {record.description ? <p className="mt-0.5 body-m">{record.description}</p> : null}
      </div>
      <IconButton label="Tutup notifikasi" className="-mt-2 -mr-2" onClick={() => onDismiss(id)}>
        <X />
      </IconButton>
    </div>
  );
}
