import '../providers/accessibility_provider.dart';

/// Minimal language-mode string system.
///
/// Screens read `ref.watch(accessibilityProvider).languageMode` and pass it
/// to helpers here. Formal uses "Anda"; Santai uses "kamu".
abstract final class AppStrings {
  // ── Pronouns ──────────────────────────────────────────────────
  static String you(LanguageMode m) =>
      m == LanguageMode.formal ? 'Anda' : 'kamu';

  static String your(LanguageMode m) =>
      m == LanguageMode.formal ? 'Anda' : 'kamu';

  // ── CTAs ──────────────────────────────────────────────────────
  static String letsStart(LanguageMode m) =>
      m == LanguageMode.formal ? 'Mulai sekarang' : 'Yuk mulai';

  static String letsTry(LanguageMode m) =>
      m == LanguageMode.formal ? 'Silakan coba' : 'Yuk coba';

  static String letsCheckIn(LanguageMode m) =>
      m == LanguageMode.formal ? 'Catat kondisi Anda' : 'Catat perasaanmu';

  // ── Check-in ──────────────────────────────────────────────────
  static String howAreYouToday(LanguageMode m) =>
      m == LanguageMode.formal
          ? 'Bagaimana kondisi Anda hari ini?'
          : 'Gimana perasaan kamu hari ini?';

  // ── Possessives ───────────────────────────────────────────────
  static String yourHealth(LanguageMode m) =>
      m == LanguageMode.formal ? 'kesehatan Anda' : 'kesehatanmu';

  static String yourJourney(LanguageMode m) =>
      m == LanguageMode.formal ? 'perjalanan Anda' : 'perjalananmu';

  static String yourData(LanguageMode m) =>
      m == LanguageMode.formal ? 'data Anda' : 'datamu';

  // ── Greetings ─────────────────────────────────────────────────
  static String greeting(String name, LanguageMode m) =>
      m == LanguageMode.formal ? 'Selamat datang, $name' : 'Hai, $name! 👋';

  // ── Generic sentence starters ─────────────────────────────────
  static String tapTo(String action, LanguageMode m) =>
      m == LanguageMode.formal ? 'Ketuk untuk $action' : 'Ketuk buat $action';

  // ── Home screen ───────────────────────────────────────────────
  static String forYouToday(LanguageMode m) =>
      m == LanguageMode.formal ? 'Untuk Anda Hari Ini' : 'Untuk Kamu Hari Ini';

  static String conditionThisWeek(LanguageMode m) => m == LanguageMode.formal
      ? 'Kondisi Anda Minggu Ini'
      : 'Kondisimu Minggu Ini';

  static String feelings7Days(LanguageMode m) => m == LanguageMode.formal
      ? 'Perasaan Anda 7 Hari'
      : 'Perasaan 7 Hari';

  // ── Mood check-in ─────────────────────────────────────────────
  static String moodCheckinPrompt(LanguageMode m) => m == LanguageMode.formal
      ? 'Bagaimana perasaan Anda hari ini?'
      : 'Gimana perasaanmu hari ini?';
}
