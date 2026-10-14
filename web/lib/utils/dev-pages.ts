/**
 * Halaman pratinjau `/dev/*` (katalog komponen) hanya aktif saat pengembangan.
 * Di produksi ia 404 kecuali `ENABLE_DEV_PAGES=true` diatur secara eksplisit
 * (mis. untuk demo juri) — jadi tidak pernah terbuka tanpa disengaja.
 */
export function isDevPagesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.ENABLE_DEV_PAGES === 'true';
}
