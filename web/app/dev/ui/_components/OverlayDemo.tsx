'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';

/** Dialog modal dan notifikasi toast. */
export function OverlayDemo() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Buka dialog
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: 'success',
            title: 'Check-in tersimpan',
            description: 'Mood hari ini sudah tercatat.',
          })
        }
      >
        Toast berhasil
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ tone: 'info', title: 'Izin diperbarui', description: 'Berlaku saat ini juga.' })
        }
      >
        Toast info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: 'error',
            title: 'Jawabanmu belum tersimpan',
            description: 'Koneksi terputus. Coba kirim lagi.',
          })
        }
      >
        Toast galat (menetap)
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Cabut semua izin Rina Sari?"
        description="Rina Sari, M.Psi. tidak akan bisa lagi melihat datamu. Kamu bisa memberi izin lagi kapan saja."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Cabut izin
            </Button>
          </>
        }
      />
    </div>
  );
}
