'use client';

import { useState, useTransition } from 'react';
import { applyFontSize } from '@/components/features/profile/FontSizeApplier';
import { RadioCard } from '@/components/ui/RadioCard';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { useToast } from '@/components/ui/Toast';
import { updateFontSizeAction } from '@/lib/profile/actions';
import { FONT_SIZE_LABEL, FONT_SIZES, type FontSize } from '@/lib/validation/profile';

const DESCRIPTION: Readonly<Record<FontSize, string>> = {
  small: 'Teks sedikit lebih kecil, muat lebih banyak.',
  normal: 'Ukuran bawaan Mindra.',
  large: 'Teks lebih besar dan lebih lega dibaca.',
};

/**
 * Ukuran teks langsung berlaku saat dipilih (pratinjau seketika), lalu disimpan ke profil sehingga ikut ke
 * perangkat lain. Bila penyimpanan gagal, tampilan dikembalikan ke ukuran sebelumnya dan pengguna diberi tahu.
 */
export function FontSizeForm({ initial }: { initial: FontSize }) {
  const { toast } = useToast();
  const [saved, setSaved] = useState<FontSize>(initial);
  const [pending, startTransition] = useTransition();

  function choose(size: FontSize) {
    const previous = saved;
    setSaved(size);
    applyFontSize(size);
    startTransition(async () => {
      const result = await updateFontSizeAction(size);
      if (result.status === 'error') {
        setSaved(previous);
        applyFontSize(previous);
        toast({ title: 'Ukuran teks belum tersimpan', description: result.message, tone: 'error' });
        return;
      }
      toast({ title: 'Ukuran teks disimpan', tone: 'success' });
    });
  }

  return (
    <RadioGroup legend="Ukuran teks">
      <div className="grid gap-3 sm:grid-cols-3">
        {FONT_SIZES.map((size) => (
          <RadioCard
            key={size}
            name="fontSize"
            value={size}
            label={FONT_SIZE_LABEL[size]}
            description={DESCRIPTION[size]}
            checked={saved === size}
            disabled={pending}
            onChange={() => choose(size)}
          />
        ))}
      </div>
    </RadioGroup>
  );
}
