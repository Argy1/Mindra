import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'shared_prefs_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

enum FontSize {
  small,
  normal,
  large,
  extraLarge;

  String get label => switch (this) {
        FontSize.small => 'Kecil',
        FontSize.normal => 'Normal',
        FontSize.large => 'Besar',
        FontSize.extraLarge => 'Sangat Besar',
      };

  double get scaleFactor => switch (this) {
        FontSize.small => 0.85,
        FontSize.normal => 1.0,
        FontSize.large => 1.15,
        FontSize.extraLarge => 1.30,
      };
}

enum LanguageMode {
  santai,
  formal;

  String get label => switch (this) {
        LanguageMode.santai => 'Santai',
        LanguageMode.formal => 'Formal',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings model
// ─────────────────────────────────────────────────────────────────────────────

class AccessibilitySettings {
  const AccessibilitySettings({
    this.fontSize = FontSize.normal,
    this.highContrast = false,
    this.languageMode = LanguageMode.santai,
    this.reduceMotion = false,
  });

  final FontSize fontSize;
  final bool highContrast;
  final LanguageMode languageMode;
  final bool reduceMotion;

  double get fontScaleFactor => fontSize.scaleFactor;

  AccessibilitySettings copyWith({
    FontSize? fontSize,
    bool? highContrast,
    LanguageMode? languageMode,
    bool? reduceMotion,
  }) =>
      AccessibilitySettings(
        fontSize: fontSize ?? this.fontSize,
        highContrast: highContrast ?? this.highContrast,
        languageMode: languageMode ?? this.languageMode,
        reduceMotion: reduceMotion ?? this.reduceMotion,
      );

  factory AccessibilitySettings.fromPrefs(SharedPreferences prefs) {
    final fontSizeName = prefs.getString('a11y_font_size') ?? FontSize.normal.name;
    final langName = prefs.getString('a11y_language') ?? LanguageMode.santai.name;
    return AccessibilitySettings(
      fontSize: FontSize.values.firstWhere(
        (e) => e.name == fontSizeName,
        orElse: () => FontSize.normal,
      ),
      highContrast: prefs.getBool('a11y_high_contrast') ?? false,
      languageMode: LanguageMode.values.firstWhere(
        (e) => e.name == langName,
        orElse: () => LanguageMode.santai,
      ),
      reduceMotion: prefs.getBool('a11y_reduce_motion') ?? false,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifier
// ─────────────────────────────────────────────────────────────────────────────

class AccessibilityNotifier extends StateNotifier<AccessibilitySettings> {
  AccessibilityNotifier(this._prefs)
      : super(AccessibilitySettings.fromPrefs(_prefs));

  final SharedPreferences _prefs;

  Future<void> setFontSize(FontSize size) async {
    state = state.copyWith(fontSize: size);
    await _prefs.setString('a11y_font_size', size.name);
  }

  Future<void> setHighContrast(bool value) async {
    state = state.copyWith(highContrast: value);
    await _prefs.setBool('a11y_high_contrast', value);
  }

  Future<void> setLanguageMode(LanguageMode mode) async {
    state = state.copyWith(languageMode: mode);
    await _prefs.setString('a11y_language', mode.name);
  }

  Future<void> setReduceMotion(bool value) async {
    state = state.copyWith(reduceMotion: value);
    await _prefs.setBool('a11y_reduce_motion', value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

final accessibilityProvider =
    StateNotifierProvider<AccessibilityNotifier, AccessibilitySettings>((ref) {
  return AccessibilityNotifier(ref.watch(sharedPrefsProvider));
});
