import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';
import 'app_spacing.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme(
        brightness: Brightness.light,
        primary: AppColors.biru500,
        onPrimary: AppColors.fgOnPrimary,
        primaryContainer: AppColors.biru100,
        onPrimaryContainer: AppColors.biru900,
        secondary: AppColors.sage500,
        onSecondary: AppColors.fgOnPrimary,
        secondaryContainer: AppColors.sage100,
        onSecondaryContainer: AppColors.sage900,
        tertiary: AppColors.matahari500,
        onTertiary: AppColors.fgOnPrimary,
        tertiaryContainer: AppColors.matahari100,
        onTertiaryContainer: AppColors.matahari900,
        error: AppColors.danger500,
        onError: AppColors.fgOnPrimary,
        errorContainer: AppColors.danger50,
        onErrorContainer: AppColors.danger900,
        surface: AppColors.surfaceCanvas,
        onSurface: AppColors.fg1,
        surfaceContainerHighest: AppColors.neutral100,
        onSurfaceVariant: AppColors.fg3,
        outline: AppColors.borderSoft,
        outlineVariant: AppColors.borderMedium,
        shadow: const Color(0xFF1E2A33),
        scrim: const Color(0xFF1E2A33),
        inverseSurface: AppColors.neutral900,
        onInverseSurface: AppColors.fgOnDark,
        inversePrimary: AppColors.biru200,
      ),
    );

    return base.copyWith(
      scaffoldBackgroundColor: AppColors.surfaceCanvas,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceCanvas,
        foregroundColor: AppColors.fg1,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        centerTitle: true,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: AppColors.fg1,
          letterSpacing: 0,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceRaised,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        margin: EdgeInsets.zero,
        shadowColor: const Color(0x0D1E2A33),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceRaised,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.borderSoft, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.borderSoft, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.biru500, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.danger500, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
          borderSide: const BorderSide(color: AppColors.danger500, width: 1.5),
        ),
        labelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          color: AppColors.neutral400,
        ),
        floatingLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.biru600,
          letterSpacing: 0.5,
        ),
        hintStyle: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          color: AppColors.neutral400,
        ),
        errorStyle: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          color: AppColors.danger500,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.biru500,
          foregroundColor: AppColors.fgOnPrimary,
          minimumSize: const Size(double.infinity, 52),
          shape: const StadiumBorder(),
          elevation: 0,
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.biru500,
          minimumSize: const Size(double.infinity, 52),
          shape: const StadiumBorder(),
          side: const BorderSide(color: AppColors.biru500, width: 1.5),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.biru500,
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceRaised,
        selectedColor: AppColors.biru500,
        labelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColors.fg2,
        ),
        shape: const StadiumBorder(
          side: BorderSide(color: AppColors.borderSoft),
        ),
        side: const BorderSide(color: AppColors.borderSoft),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderSoft,
        thickness: 1,
        space: 0,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceRaised,
        selectedItemColor: AppColors.biru500,
        unselectedItemColor: AppColors.neutral400,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: GoogleFonts.plusJakartaSans(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceRaised,
        contentTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          color: AppColors.fg1,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.tag),
        ),
        elevation: 8,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.biru500,
        linearTrackColor: AppColors.neutral100,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme().copyWith(
        bodyLarge: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          height: 1.6,
          color: AppColors.fg2,
        ),
        bodyMedium: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          height: 1.6,
          color: AppColors.fg3,
        ),
        bodySmall: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          height: 1.6,
          color: AppColors.fg4,
        ),
        titleLarge: GoogleFonts.plusJakartaSans(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: AppColors.fg1,
        ),
        titleMedium: GoogleFonts.plusJakartaSans(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.fg1,
        ),
        titleSmall: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.fg1,
        ),
        labelLarge: GoogleFonts.plusJakartaSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        labelMedium: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
        labelSmall: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  /// Warm-tinted shadows matching the design system.
  static List<BoxShadow> get shadowXs => [
        const BoxShadow(
          color: Color(0x0A1E2A33),
          blurRadius: 2,
          offset: Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get shadowSm => [
        const BoxShadow(
          color: Color(0x0D1E2A33),
          blurRadius: 6,
          offset: Offset(0, 2),
        ),
        const BoxShadow(
          color: Color(0x0A1E2A33),
          blurRadius: 2,
          offset: Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get shadowMd => [
        const BoxShadow(
          color: Color(0x121E2A33),
          blurRadius: 16,
          offset: Offset(0, 6),
        ),
        const BoxShadow(
          color: Color(0x0A1E2A33),
          blurRadius: 4,
          offset: Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get shadowLg => [
        const BoxShadow(
          color: Color(0x171E2A33),
          blurRadius: 32,
          offset: Offset(0, 14),
        ),
        const BoxShadow(
          color: Color(0x0D1E2A33),
          blurRadius: 8,
          offset: Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get shadowXl => [
        const BoxShadow(
          color: Color(0x1F1E2A33),
          blurRadius: 48,
          offset: Offset(0, 24),
        ),
        const BoxShadow(
          color: Color(0x0F1E2A33),
          blurRadius: 16,
          offset: Offset(0, 8),
        ),
      ];
}
