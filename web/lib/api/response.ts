import { type ApiError, type ApiErrorCode } from '@/lib/api/errors';

/**
 * Bentuk respons API v1: `{ data, error }`, dengan `meta` opsional (mis. kursor halaman berikutnya).
 * Setiap respons membawa `Cache-Control: no-store` (data kesehatan tidak boleh tersimpan di cache
 * perantara), `X-Content-Type-Options: nosniff`, dan `X-Request-Id` untuk korelasi saat ada keluhan.
 */
export const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;

export interface ResponseMeta {
  [key: string]: unknown;
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string>; contentType?: string } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...BASE_HEADERS,
      'Content-Type': init.contentType ?? 'application/json; charset=utf-8',
      ...init.headers,
    },
  });
}

export function successBody(data: unknown, meta?: ResponseMeta) {
  return { data, error: null, ...(meta ? { meta } : {}) };
}

export function errorBody(error: ApiError) {
  return {
    data: null,
    error: {
      code: error.code,
      message: error.message,
      ...(error.issues ? { issues: error.issues } : {}),
    },
  };
}

const FHIR_ISSUE_CODE: Readonly<Record<ApiErrorCode, string>> = {
  invalid_json: 'structure',
  unauthorized: 'login',
  forbidden: 'forbidden',
  not_found: 'not-found',
  conflict: 'conflict',
  payload_too_large: 'too-costly',
  unsupported_media_type: 'not-supported',
  validation_failed: 'invalid',
  rate_limited: 'throttled',
  internal_error: 'exception',
  upstream_error: 'transient',
  not_configured: 'transient',
};

/** Galat sebagai FHIR OperationOutcome, untuk klien FHIR yang tidak mengenal amplop `{ data, error }`. */
export function operationOutcome(error: ApiError) {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code: FHIR_ISSUE_CODE[error.code],
        diagnostics: error.message,
        ...(error.issues
          ? { expression: error.issues.map((issue) => issue.path).filter(Boolean) }
          : {}),
      },
    ],
  };
}

export const FHIR_CONTENT_TYPE = 'application/fhir+json; charset=utf-8';
