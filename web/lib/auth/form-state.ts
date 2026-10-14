/** Status formulir yang dikembalikan Server Action ke `useActionState`. Berkas ini BUKAN "use server". */
export interface FormState {
  status: 'idle' | 'error' | 'success';
  /** Pesan tingkat formulir (galat server atau konfirmasi). */
  message?: string;
  /** Satu pesan per kolom. */
  fieldErrors?: Record<string, string>;
  /** Nilai non-rahasia untuk mengisi ulang kolom setelah galat. Kata sandi TIDAK pernah dikembalikan. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: 'idle' };
