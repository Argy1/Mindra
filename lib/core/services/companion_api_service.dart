import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../features/ai_companion/data/companion_stream.dart';
import '../../features/ai_companion/domain/entities/companion_event.dart';

enum CompanionErrorKind {
  network,
  auth,
  rateLimit,
  server,
  notConfigured,
  invalid,
  unknown,
}

/// Galat dari Teman cerita (HTTP, jaringan, atau peristiwa `error` di tengah aliran).
/// [message] aman ditampilkan: berbahasa Indonesia dan tidak memuat isi percakapan.
class CompanionApiException implements Exception {
  CompanionApiException(
    this.message, {
    this.statusCode,
    this.kind = CompanionErrorKind.unknown,
    this.code,
  });

  final String message;
  final int? statusCode;
  final CompanionErrorKind kind;

  /// Kode tetap dari server, mis. `not_found`, `conversation_full`, `rate_limited`.
  final String? code;

  /// Percakapan yang dirujuk tidak bisa dilanjutkan: pesan berikutnya harus memulai percakapan baru.
  bool get conversationUnusable =>
      code == 'not_found' ||
      code == 'conversation_corrupt' ||
      code == 'conversation_full';

  @override
  String toString() => 'CompanionApiException($kind, $statusCode, $code)';
}

CompanionErrorKind _kindOf(int? status, String? code) {
  switch (code) {
    case 'unauthorized':
    case 'forbidden':
      return CompanionErrorKind.auth;
    case 'rate_limited':
      return CompanionErrorKind.rateLimit;
    case 'not_configured':
      return CompanionErrorKind.notConfigured;
    case 'validation_failed':
    case 'invalid_json':
    case 'conversation_full':
      return CompanionErrorKind.invalid;
    case 'internal_error':
    case 'upstream_error':
    case 'model_unavailable':
    case 'empty_reply':
    case 'load_failed':
      return CompanionErrorKind.server;
  }
  if (status == 401 || status == 403) return CompanionErrorKind.auth;
  if (status == 429) return CompanionErrorKind.rateLimit;
  if (status != null && status >= 500) return CompanionErrorKind.server;
  return CompanionErrorKind.unknown;
}

/// Mengubah jawaban galat HTTP server (`{ data: null, error: { code, message, issues? } }`) menjadi pengecualian.
/// Pesan server dipakai bila ada (Indonesia dan tanpa isi pesan pengguna); bila tidak, pesan bawaan.
CompanionApiException companionHttpException(int status, String body) {
  String? code;
  String? message;
  try {
    final decoded = jsonDecode(body);
    final error = decoded is Map<String, dynamic> ? decoded['error'] : null;
    if (error is Map<String, dynamic>) {
      code = error['code'] is String ? error['code'] as String : null;
      message = error['message'] is String ? error['message'] as String : null;
      final issues = error['issues'];
      if (issues is List && issues.isNotEmpty) {
        final first = issues.first;
        if (first is Map<String, dynamic> && first['message'] is String) {
          message = first['message'] as String;
        }
      }
    }
  } on FormatException {
    // Badan bukan JSON (mis. halaman galat dari perantara): pakai pesan bawaan.
  }

  final kind = _kindOf(status, code);
  final fallback = switch (kind) {
    CompanionErrorKind.auth =>
      'Sesimu sudah berakhir. Masuk lagi untuk bercerita.',
    CompanionErrorKind.rateLimit =>
      'Kamu sudah banyak bercerita dalam satu jam terakhir. Istirahat sebentar, lalu lanjutkan lagi nanti.',
    CompanionErrorKind.notConfigured =>
      'Teman cerita belum aktif untuk saat ini.',
    CompanionErrorKind.server =>
      'Teman cerita sedang tidak bisa menjawab. Coba lagi sebentar lagi.',
    _ => 'Pesanmu belum bisa dikirim (kode $status). Coba lagi.',
  };
  return CompanionApiException(
    (message != null && message.trim().isNotEmpty) ? message : fallback,
    statusCode: status,
    kind: kind,
    code: code,
  );
}

/// Klien Teman cerita: memanggil `POST /api/v1/companion/chat` di Mindra Web dengan token sesi Supabase pengguna.
///
/// Tidak ada kunci model di aplikasi: kunci Anthropic hanya ada di server web, jadi tidak bisa diekstrak dari
/// APK atau IPA (menutup temuan F7). Server juga yang mendeteksi krisis, menyimpan percakapan, dan menegakkan
/// batas 20 pesan per jam.
class CompanionApiService {
  CompanionApiService({
    required this.baseUrl,
    required this.accessToken,
    http.Client? client,
    this.connectTimeout = const Duration(seconds: 30),
  }) : _client = client ?? http.Client();

  /// Alamat dasar Mindra Web, mis. `https://mindra.vercel.app` (tanpa garis miring di akhir).
  final String baseUrl;

  /// Token akses sesi Supabase saat ini (dibaca setiap pesan, jadi selalu yang terbaru); null bila belum masuk.
  final Future<String?> Function() accessToken;
  final Duration connectTimeout;
  final http.Client _client;

  Uri get endpoint => Uri.parse(
      '${baseUrl.trim().replaceAll(RegExp(r'/+$'), '')}/api/v1/companion/chat');

  /// Mengirim satu pesan dan mengalirkan peristiwa balasan. Melempar [CompanionApiException] untuk galat HTTP,
  /// jaringan, dan peristiwa `error` dari server.
  Stream<CompanionEvent> send({
    String? conversationId,
    required String message,
  }) async* {
    if (baseUrl.trim().isEmpty) {
      throw CompanionApiException(
        'Teman cerita belum tersedia di versi aplikasi ini.',
        kind: CompanionErrorKind.notConfigured,
      );
    }
    final token = await accessToken();
    if (token == null || token.isEmpty) {
      throw CompanionApiException(
        'Sesimu sudah berakhir. Masuk lagi untuk bercerita.',
        kind: CompanionErrorKind.auth,
        code: 'unauthorized',
      );
    }

    final request = http.Request('POST', endpoint)
      ..headers.addAll({
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': 'Bearer $token',
      })
      ..body = jsonEncode({
        'message': message,
        if (conversationId != null) 'conversationId': conversationId,
      });

    final http.StreamedResponse response;
    try {
      response = await _client.send(request).timeout(connectTimeout);
    } on Exception {
      throw CompanionApiException(
        'Tidak dapat terhubung ke server. Periksa koneksi internetmu.',
        kind: CompanionErrorKind.network,
      );
    }

    if (response.statusCode != 200) {
      final body = await response.stream.bytesToString();
      throw companionHttpException(response.statusCode, body);
    }

    try {
      await for (final event
          in parseCompanionSse(response.stream.transform(utf8.decoder))) {
        if (event is CompanionStreamError) {
          throw CompanionApiException(
            event.message,
            kind: _kindOf(null, event.code),
            code: event.code,
          );
        }
        yield event;
      }
    } on http.ClientException {
      throw CompanionApiException(
        'Koneksi terputus saat menerima balasan. Coba kirim lagi.',
        kind: CompanionErrorKind.network,
      );
    }
  }

  void dispose() => _client.close();
}
