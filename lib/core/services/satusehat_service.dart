import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Categories of failure when talking to SATUSEHAT.
enum SatusehatErrorKind {
  /// No connectivity / socket failure — safe to queue and retry.
  network,

  /// OAuth token rejected — refresh token and retry once.
  auth,

  /// FHIR payload rejected (HTTP 400/422) — a bug; do NOT blindly retry.
  validation,

  /// HTTP 429 — respect `Retry-After`.
  rateLimit,

  /// HTTP 5xx — transient server error, safe to retry with backoff.
  server,

  unknown,
}

/// Outcome of a single SATUSEHAT FHIR request.
class SatusehatResponse {
  const SatusehatResponse({
    required this.success,
    this.fhirId,
    this.statusCode,
    this.errorMessage,
    this.errorKind,
    this.retryAfter,
    this.isMock = false,
    this.rawBody,
  });

  final bool success;

  /// FHIR logical id assigned by SATUSEHAT (on success).
  final String? fhirId;
  final int? statusCode;
  final String? errorMessage;
  final SatusehatErrorKind? errorKind;

  /// Populated for [SatusehatErrorKind.rateLimit] from the `Retry-After` header.
  final Duration? retryAfter;

  /// True when produced by the offline mock (credentials not configured).
  final bool isMock;
  final Map<String, dynamic>? rawBody;

  /// Whether queuing + retrying later is appropriate for this failure.
  bool get isRetryable =>
      !success &&
      errorKind != SatusehatErrorKind.validation &&
      errorKind != null;

  factory SatusehatResponse.mock(String resourceType) => SatusehatResponse(
        success: true,
        fhirId: 'mock-${resourceType.toLowerCase()}-'
            '${DateTime.now().millisecondsSinceEpoch}',
        statusCode: 201,
        isMock: true,
      );
}

/// Client for the SATUSEHAT (Kemenkes RI) national health platform.
///
/// Responsibilities:
/// - OAuth 2.0 client-credentials flow with cached + auto-refreshed tokens.
/// - Persisting the access token in secure storage (survives restarts).
/// - Posting FHIR R4 resources.
/// - A built-in mock mode so the app stays functional without real
///   credentials during development and demos.
///
/// FHIR payloads are built by `FhirMappers`; this service only transports them.
class SatusehatService {
  SatusehatService({
    required this.baseUrl,
    required this.clientId,
    required this.clientSecret,
    http.Client? client,
    FlutterSecureStorage? secureStorage,
  })  : _client = client ?? http.Client(),
        _storage = secureStorage ?? const FlutterSecureStorage();

  final String baseUrl;
  final String clientId;
  final String clientSecret;
  final http.Client _client;
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'satusehat_access_token';
  static const _tokenExpiryKey = 'satusehat_token_expiry';

  /// Refresh the token this long before it actually expires.
  static const _expiryGuard = Duration(seconds: 60);

  String? _cachedToken;
  DateTime? _cachedExpiry;
  Future<String?>? _inFlightTokenRequest;

  /// True when credentials are absent — the service serves synthetic
  /// responses so the rest of the app keeps working.
  bool get isMockMode => clientId.isEmpty || clientSecret.isEmpty;

  String get _fhirBase => '$baseUrl/fhir-r4/v1';
  String get _tokenEndpoint =>
      '$baseUrl/oauth2/v1/accesstoken?grant_type=client_credentials';

  // ───────────────────────────────────────────────────────────────────────────
  // Token management
  // ───────────────────────────────────────────────────────────────────────────

  bool _tokenValid(DateTime? expiry) =>
      expiry != null && DateTime.now().isBefore(expiry.subtract(_expiryGuard));

  /// Returns a valid access token, refreshing if necessary.
  /// Coalesces concurrent callers onto a single network request.
  Future<String?> _ensureToken() async {
    if (isMockMode) return 'mock-token';

    if (_cachedToken != null && _tokenValid(_cachedExpiry)) {
      return _cachedToken;
    }

    // Try persisted token (survives app restarts).
    if (_cachedToken == null) {
      final stored = await _storage.read(key: _tokenKey);
      final storedExpiry = await _storage.read(key: _tokenExpiryKey);
      if (stored != null && storedExpiry != null) {
        final expiry = DateTime.tryParse(storedExpiry);
        if (_tokenValid(expiry)) {
          _cachedToken = stored;
          _cachedExpiry = expiry;
          return _cachedToken;
        }
      }
    }

    // Coalesce concurrent refreshes.
    _inFlightTokenRequest ??= _fetchToken();
    try {
      return await _inFlightTokenRequest;
    } finally {
      _inFlightTokenRequest = null;
    }
  }

  Future<String?> _fetchToken() async {
    try {
      final resp = await _client.post(
        Uri.parse(_tokenEndpoint),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {'client_id': clientId, 'client_secret': clientSecret},
      ).timeout(const Duration(seconds: 20));

      if (resp.statusCode != 200) return null;

      final body = jsonDecode(resp.body) as Map<String, dynamic>;
      final token = body['access_token'] as String?;
      // SATUSEHAT returns expires_in as a string of seconds.
      final expiresIn = int.tryParse('${body['expires_in'] ?? ''}') ?? 3599;
      if (token == null) return null;

      _cachedToken = token;
      _cachedExpiry = DateTime.now().add(Duration(seconds: expiresIn));

      await _storage.write(key: _tokenKey, value: token);
      await _storage.write(
        key: _tokenExpiryKey,
        value: _cachedExpiry!.toIso8601String(),
      );
      return token;
    } catch (e) {
      debugPrint('Gagal mengambil token SATUSEHAT: $e');
      return null;
    }
  }

  /// Drops the cached token (used after a 401 before retrying).
  Future<void> _invalidateToken() async {
    _cachedToken = null;
    _cachedExpiry = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _tokenExpiryKey);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FHIR resource creation
  // ───────────────────────────────────────────────────────────────────────────

  /// Creates a FHIR resource. [resourceType] e.g. 'Patient', 'Observation',
  /// 'Encounter'. [body] is the full FHIR JSON payload.
  ///
  /// On a 401 the token is refreshed and the request retried exactly once.
  Future<SatusehatResponse> createResource(
    String resourceType,
    Map<String, dynamic> body, {
    bool isRetry = false,
  }) async {
    if (isMockMode) {
      // Small delay so callers exercise their loading states realistically.
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return SatusehatResponse.mock(resourceType);
    }

    final token = await _ensureToken();
    if (token == null) {
      return const SatusehatResponse(
        success: false,
        errorKind: SatusehatErrorKind.auth,
        errorMessage: 'Tidak dapat memperoleh token SATUSEHAT.',
      );
    }

    try {
      final resp = await _client
          .post(
            Uri.parse('$_fhirBase/$resourceType'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 30));

      return _interpret(resp, resourceType, isRetry: isRetry);
    } on TimeoutException {
      return const SatusehatResponse(
        success: false,
        errorKind: SatusehatErrorKind.network,
        errorMessage: 'Koneksi ke SATUSEHAT timeout.',
      );
    } catch (e) {
      debugPrint('Gagal terhubung ke SATUSEHAT: $e');
      return const SatusehatResponse(
        success: false,
        errorKind: SatusehatErrorKind.network,
        errorMessage: 'Gagal terhubung ke SATUSEHAT.',
      );
    }
  }

  Future<SatusehatResponse> _interpret(
    http.Response resp,
    String resourceType, {
    required bool isRetry,
  }) async {
    final code = resp.statusCode;

    // Success — 200 OK or 201 Created.
    if (code == 200 || code == 201) {
      Map<String, dynamic>? parsed;
      try {
        parsed = jsonDecode(resp.body) as Map<String, dynamic>;
      } catch (e) {
        debugPrint('Respons sukses SATUSEHAT tidak bisa diparse: $e');
      }
      return SatusehatResponse(
        success: true,
        statusCode: code,
        fhirId: parsed?['id'] as String?,
        rawBody: parsed,
      );
    }

    // Auth — refresh once, then retry.
    if (code == 401 && !isRetry) {
      await _invalidateToken();
      // Re-issue the request once; payload is unchanged so re-parse it.
      Map<String, dynamic>? original;
      try {
        original = jsonDecode(resp.request is http.Request
            ? (resp.request as http.Request).body
            : '{}') as Map<String, dynamic>;
      } catch (e) {
        debugPrint('Payload retry SATUSEHAT tidak bisa diparse: $e');
      }
      if (original != null) {
        return createResource(resourceType, original, isRetry: true);
      }
    }

    if (code == 401 || code == 403) {
      return SatusehatResponse(
        success: false,
        statusCode: code,
        errorKind: SatusehatErrorKind.auth,
        errorMessage: 'Otorisasi SATUSEHAT ditolak.',
      );
    }

    // Rate limited.
    if (code == 429) {
      final retryHeader = resp.headers['retry-after'];
      final seconds = int.tryParse(retryHeader ?? '') ?? 60;
      return SatusehatResponse(
        success: false,
        statusCode: code,
        errorKind: SatusehatErrorKind.rateLimit,
        retryAfter: Duration(seconds: seconds),
        errorMessage: 'Terlalu banyak permintaan ke SATUSEHAT.',
      );
    }

    // Validation — a bug in our mapping; surface loudly.
    if (code == 400 || code == 422) {
      return SatusehatResponse(
        success: false,
        statusCode: code,
        errorKind: SatusehatErrorKind.validation,
        errorMessage: 'Payload FHIR ditolak SATUSEHAT: ${resp.body}',
      );
    }

    // Server error.
    if (code >= 500) {
      return SatusehatResponse(
        success: false,
        statusCode: code,
        errorKind: SatusehatErrorKind.server,
        errorMessage: 'SATUSEHAT mengalami gangguan ($code).',
      );
    }

    return SatusehatResponse(
      success: false,
      statusCode: code,
      errorKind: SatusehatErrorKind.unknown,
      errorMessage: 'Respons tak terduga dari SATUSEHAT ($code).',
    );
  }

  void dispose() => _client.close();
}
