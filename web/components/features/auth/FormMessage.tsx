import { Alert } from '@/components/ui/Alert';
import type { FormState } from '@/lib/auth/form-state';

/** Pesan tingkat formulir. Galat memakai role="alert" (diumumkan segera); sukses memakai status. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === 'idle' || !state.message) return null;
  const isError = state.status === 'error';

  return (
    <Alert tone={isError ? 'error' : 'success'} role={isError ? 'alert' : 'status'} compact>
      <p className="text-sm">{state.message}</p>
    </Alert>
  );
}
