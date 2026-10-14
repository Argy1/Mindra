/**
 * Galat API publik. Kode adalah kontrak mesin (stabil, huruf kecil); pesan untuk manusia dalam Bahasa
 * Indonesia. Pesan TIDAK PERNAH memuat nilai yang dikirim klien (bisa data kesehatan) maupun detail internal.
 */
export const API_ERROR_STATUS = {
  invalid_json: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  validation_failed: 422,
  rate_limited: 429,
  internal_error: 500,
  upstream_error: 502,
  not_configured: 503,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export const API_ERROR_CODES = Object.keys(API_ERROR_STATUS) as ApiErrorCode[];

/** Satu masalah validasi: lokasi (mis. `answers.phq9_3`) dan alasan, tanpa nilai yang dikirim. */
export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorOptions {
  issues?: ValidationIssue[];
  /** Detik, untuk `rate_limited` (header Retry-After). */
  retryAfter?: number;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues: ValidationIssue[] | undefined;
  readonly retryAfter: number | undefined;
  readonly headers: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string = DEFAULT_ERROR_MESSAGE[code],
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = API_ERROR_STATUS[code];
    this.issues = options.issues;
    this.retryAfter = options.retryAfter;
    this.headers = options.headers ?? {};
  }
}

/** Pesan baku per kode, dipakai bila pemanggil tidak memberi pesan khusus. */
export const DEFAULT_ERROR_MESSAGE: Readonly<Record<ApiErrorCode, string>> = {
  invalid_json: 'Badan permintaan bukan JSON yang valid.',
  unauthorized: 'Kredensial tidak ada atau tidak valid.',
  forbidden: 'Kredensial valid, tetapi tidak berhak atas sumber daya ini.',
  not_found: 'Sumber daya tidak ditemukan.',
  conflict: 'Permintaan bertentangan dengan keadaan saat ini.',
  payload_too_large: 'Badan permintaan terlalu besar.',
  unsupported_media_type: 'Content-Type harus application/json.',
  validation_failed: 'Permintaan tidak lolos validasi.',
  rate_limited: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
  internal_error: 'Terjadi kesalahan di server. Coba lagi nanti.',
  upstream_error: 'Layanan eksternal tidak menjawab dengan benar.',
  not_configured: 'Layanan belum dikonfigurasi.',
};
