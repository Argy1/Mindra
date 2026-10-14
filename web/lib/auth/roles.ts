/** Peran akun (docs/ARCHITECTURE.md §2). Sama dengan CHECK `profiles_role_check` di database. */
export const USER_ROLES = ['user', 'psychologist', 'caregiver', 'facility_admin', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/** Halaman utama tiap peran: tujuan sesudah masuk, dan tempat pengguna "dipulangkan" bila salah rute. */
export const ROLE_HOME: Record<UserRole, string> = {
  user: '/beranda',
  psychologist: '/psikolog',
  caregiver: '/pendamping',
  facility_admin: '/faskes',
  admin: '/admin',
};

/** Teks di bawah nama pada sidebar. */
export const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Pengguna',
  psychologist: 'Psikolog',
  caregiver: 'Pendamping',
  facility_admin: 'Admin faskes',
  admin: 'Admin',
};
