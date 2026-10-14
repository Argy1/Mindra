import 'package:flutter_dotenv/flutter_dotenv.dart';

/// App-wide constants and runtime-resolved configuration values.
///
/// Resolution order for each secret/URL:
///   1. Compile-time `--dart-define=<KEY>=...` (preferred for production —
///      keeps secrets out of bundled assets).
///   2. Runtime `.env` (loaded by `flutter_dotenv` in `main()`) — used during
///      local development.
///   3. A safe fallback so the app never crashes when neither is set.
abstract final class AppConstants {
  // ── Supabase ──────────────────────────────────────────────────────────────
  static String get supabaseUrl => _resolve(
        'SUPABASE_URL',
        compileTime: const String.fromEnvironment('SUPABASE_URL'),
        fallback: 'https://your-project.supabase.co',
      );

  static String get supabaseAnonKey => _resolve(
        'SUPABASE_ANON_KEY',
        compileTime: const String.fromEnvironment('SUPABASE_ANON_KEY'),
        fallback: 'your-anon-key',
      );

  // ── Mindra Web (Teman cerita lewat server) ────────────────────────────────
  /// Alamat dasar Mindra Web, mis. `https://mindra.vercel.app`. Teman cerita memanggil
  /// `POST <alamat>/api/v1/companion/chat` dengan token sesi Supabase; kunci model hanya ada di server web,
  /// jadi TIDAK ada kunci Anthropic di aplikasi (menutup temuan F7). Kosong = Teman cerita dinonaktifkan.
  static String get webApiBaseUrl => _resolve(
        'WEB_API_BASE_URL',
        compileTime: const String.fromEnvironment('WEB_API_BASE_URL'),
        fallback: '',
      );

  // ── Native integrations (not yet wired) ───────────────────────────────────
  static String get agoraAppId => _resolve(
        'AGORA_APP_ID',
        compileTime: const String.fromEnvironment('AGORA_APP_ID'),
        fallback: '',
      );

  static String get googleMapsApiKey => _resolve(
        'GOOGLE_MAPS_API_KEY',
        compileTime: const String.fromEnvironment('GOOGLE_MAPS_API_KEY'),
        fallback: '',
      );

  // ── SATUSEHAT (Kemenkes RI national health record) ────────────────────────
  static String get satusehatBaseUrl => _resolve(
        'SATUSEHAT_BASE_URL',
        compileTime: const String.fromEnvironment('SATUSEHAT_BASE_URL'),
        fallback: 'https://api-satusehat.kemkes.go.id',
      );

  static String get satusehatClientId => _resolve(
        'SATUSEHAT_CLIENT_ID',
        compileTime: const String.fromEnvironment('SATUSEHAT_CLIENT_ID'),
        fallback: '',
      );

  static String get satusehatClientSecret => _resolve(
        'SATUSEHAT_CLIENT_SECRET',
        compileTime: const String.fromEnvironment('SATUSEHAT_CLIENT_SECRET'),
        fallback: '',
      );

  /// SATUSEHAT Organization ID issued to Mindra by Kemenkes.
  static String get satusehatOrganizationId => _resolve(
        'SATUSEHAT_ORGANIZATION_ID',
        compileTime: const String.fromEnvironment('SATUSEHAT_ORGANIZATION_ID'),
        fallback: '',
      );

  // ── Pure constants ────────────────────────────────────────────────────────
  static const appName = 'Mindra';
  static const onboardingShownKey = 'onboarding_shown';
  static const defaultLocale = 'id_ID';

  // ── Resolver ──────────────────────────────────────────────────────────────
  static String _resolve(
    String key, {
    required String compileTime,
    required String fallback,
  }) {
    if (compileTime.isNotEmpty) return compileTime;
    if (dotenv.isInitialized) {
      final v = dotenv.maybeGet(key);
      if (v != null && v.trim().isNotEmpty) return v.trim();
    }
    return fallback;
  }
}
