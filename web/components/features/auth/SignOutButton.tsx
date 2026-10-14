import { SignOut } from '@phosphor-icons/react/ssr';
import { IconButton } from '@/components/ui/IconButton';
import { signOutAction } from '@/lib/auth/actions';

/** Tombol keluar. Berupa <form> + Server Action, sehingga tetap bekerja tanpa JavaScript. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <IconButton label="Keluar" type="submit">
        <SignOut />
      </IconButton>
    </form>
  );
}
