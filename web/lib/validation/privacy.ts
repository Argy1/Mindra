import { randomInt } from 'node:crypto';
import { z } from 'zod';

/** Nomor ponsel Indonesia: 08…, 628…, atau +628…; spasi dan strip diabaikan. Hasilnya tanpa spasi/strip. */
export const phoneSchema = z
  .string({ error: 'Isi nomor ponsel pendampingmu.' })
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => /^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(value), {
    error: 'Isi nomor ponsel yang benar, mis. 0812 3456 7890.',
  });

/** Alfabet kode undangan: 32 simbol tanpa yang mudah tertukar (I, O, 0, 1), sama dengan server dan Flutter. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Kode undangan acak dari CSPRNG (`crypto.randomInt`, tanpa bias modulo). Server database SELALU
 * menimpanya dengan kode buatannya sendiri (trigger, migrasi 20261014000100); nilai ini hanya
 * pengisi tempat yang aman, supaya sebelum migrasi diterapkan pun tidak ada kode tetap atau kembar.
 */
export function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** Kode yang diketik penerima: huruf besar, spasi dan strip dibuang, 4–32 karakter alfanumerik. */
export const inviteCodeInputSchema = z
  .string({ error: 'Isi kode undangan dari pasienmu.' })
  .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
  .refine((value) => /^[A-Z0-9]{4,32}$/.test(value), {
    error: 'Kode undangan biasanya 8 huruf dan angka. Periksa lagi kodenya.',
  });
