/**
 * Apakah item navigasi `href` aktif untuk `currentPath`?
 * - `exact`: hanya cocok persis (untuk halaman akar portal seperti `/psikolog`, supaya
 *   tidak ikut menyala di `/psikolog/jadwal`).
 * - selain itu: cocok persis atau berupa induk segmen (`/asesmen` aktif di `/asesmen/phq9`).
 */
export function isActivePath(href: string, currentPath: string, exact = false): boolean {
  const path = stripTrailingSlash(currentPath.split(/[?#]/)[0] ?? '');
  const target = stripTrailingSlash(href);
  if (path === target) return true;
  return !exact && path.startsWith(`${target}/`);
}

function stripTrailingSlash(value: string): string {
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
}
