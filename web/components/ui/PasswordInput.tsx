'use client';

import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react/ssr';
import { IconButton } from '@/components/ui/IconButton';
import { Input, type InputProps } from '@/components/ui/Input';

/**
 * Kolom kata sandi dengan tombol tampilkan/sembunyikan. Tombolnya `aria-pressed` dan bernama
 * jelas; autocomplete wajib diatur pemanggil (`current-password` atau `new-password`) agar
 * pengelola kata sandi bekerja.
 */
export function PasswordInput(props: Omit<InputProps, 'type' | 'endAdornment'>) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <IconButton
          label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeSlash /> : <Eye />}
        </IconButton>
      }
    />
  );
}
