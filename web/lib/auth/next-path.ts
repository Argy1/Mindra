const BASE = 'http://mindra.invalid';

/** Karakter kontrol (CR, LF, NUL, …) tidak pernah sah di tujuan pengalihan. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Pemeriksaan bentuk yang harus lolos oleh jalur mentah MAUPUN hasil decode-nya. */
function isUnsafeShape(value: string): boolean {
  return (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    CONTROL_CHARS.test(value)
  );
}

/**
 * Tujuan pengalihan (`?next=`) yang aman. Hanya jalur relatif satu-origin yang diterima, supaya
 * tautan masuk tidak bisa dipakai untuk mengirim pengguna ke situs lain (open redirect).
 *
 * Ditolak: "//evil.com", "/\\evil.com", "https://evil.com", "javascript:…", karakter kontrol
 * (termasuk yang di-encode, mis. "%0d%0a"), dan jalur yang diparse ke origin berbeda.
 * Selebihnya mengembalikan `fallback`.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return fallback;
  if (isUnsafeShape(raw)) return fallback;

  // Periksa juga bentuk setelah decode: "/%2f%2fevil.com" atau "/%0d%0a…" tidak boleh lolos.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (isUnsafeShape(decoded)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;

  // Jangan kembali ke halaman auth (menghindari putaran masuk → masuk).
  if (/^\/(masuk|daftar|lupa-sandi)(\/|$)/.test(url.pathname)) return fallback;

  return url.pathname + url.search;
}
