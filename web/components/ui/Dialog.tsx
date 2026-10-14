'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react/ssr';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wajib: menjadi nama aksesibel dialog (`aria-labelledby`). */
  title: string;
  description?: string;
  children?: ReactNode;
  /** Baris tombol di bawah, rata kanan. */
  footer?: ReactNode;
  /**
   * `false` = tidak bisa ditutup dengan ESC atau klik latar (mis. konfirmasi yang harus dijawab).
   * Tombol tutup (X) tetap ada kecuali `hideCloseButton`.
   */
  dismissible?: boolean;
  hideCloseButton?: boolean;
  className?: string;
}

/**
 * Dialog modal memakai elemen <dialog> native + showModal(). Browser yang mengurus:
 * jebakan fokus, ESC, latar tidak bisa diklik (inert), dan fokus kembali ke pemicu.
 * Tanpa pustaka tambahan, dan perilaku aksesibelnya dijamin platform, bukan kode kita.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  hideCloseButton = false,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Sinkronkan prop `open` ke state native.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Klik latar hanyalah kemudahan untuk pointer; pengguna keyboard memakai ESC / tombol tutup.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- lihat komentar di atas
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClick={(event) => {
        // Klik di ::backdrop terdeteksi sebagai klik pada <dialog> itu sendiri
        // (isi dialog dibungkus <div> berpadding, jadi klik di dalam tidak ikut).
        if (dismissible && event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl',
        'bg-raised p-0 text-fg-2 shadow-xl backdrop:bg-neutral-900/45 open:animate-dialog-in',
        className,
      )}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="h2">
            {title}
          </h2>
          {hideCloseButton ? null : (
            <IconButton label="Tutup" className="-mt-2 -mr-2" onClick={() => onOpenChange(false)}>
              <X />
            </IconButton>
          )}
        </div>
        {description ? (
          <p id={descriptionId} className="mt-1.5 body-m">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </dialog>
  );
}
