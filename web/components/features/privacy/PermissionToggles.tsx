'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { PERMISSION_LABEL, type PermissionKind } from '@/lib/domain/privacy/permissions';
import { setPermissionAction } from '@/lib/privacy/actions';

interface PermissionTogglesProps {
  kind: PermissionKind;
  /** Id baris `care_links` atau `caregiver_relationships`. */
  id: string;
  /** Nama orang yang menerima izin; dipakai di label saklar untuk pembaca layar. */
  ownerName: string;
  keys: readonly string[];
  permissions: Readonly<Record<string, boolean>>;
}

/**
 * Saklar izin per orang. Tampilan berubah seketika (useOptimistic) dan diteguhkan oleh server; bila
 * server menolak, saklar kembali ke keadaan sebenarnya dan alasannya ditampilkan. Perubahan berlaku
 * saat itu juga di database karena `can_view()` membaca izin ini di setiap kueri.
 */
export function PermissionToggles({
  kind,
  id,
  ownerName,
  keys,
  permissions,
}: PermissionTogglesProps) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState('');
  const [optimistic, setOptimistic] = useOptimistic(
    permissions,
    (state, change: { key: string; enabled: boolean }) => ({
      ...state,
      [change.key]: change.enabled,
    }),
  );

  function change(key: string, enabled: boolean) {
    startTransition(async () => {
      setOptimistic({ key, enabled });
      const result = await setPermissionAction({ kind, id, key, enabled });
      if (result.status === 'error') {
        toast({ title: 'Izin belum berubah', description: result.message, tone: 'error' });
        return;
      }
      setAnnouncement(
        `${PERMISSION_LABEL[key]} untuk ${ownerName} ${enabled ? 'diizinkan' : 'dimatikan'}.`,
      );
    });
  }

  return (
    <div>
      <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
        {keys.map((key) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2.5 rounded-md bg-canvas px-3 py-2.5 text-sm text-fg-2"
          >
            <span>{PERMISSION_LABEL[key]}</span>
            <Switch
              label={`${PERMISSION_LABEL[key]} untuk ${ownerName}`}
              checked={optimistic[key] === true}
              onCheckedChange={(enabled) => change(key, enabled)}
            />
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
