import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Mindra typography scale.
/// Display: Instrument Serif (via google_fonts)
/// Body/UI: Plus Jakarta Sans (via google_fonts)
abstract final class AppTextStyles {
  // ── Display — Instrument Serif ────────────────────────────────
  static TextStyle get displayXL => GoogleFonts.instrumentSerif(
        fontSize: 40,
        fontWeight: FontWeight.w400,
        height: 1.2,
        letterSpacing: -0.8,
        color: AppColors.fg1,
      );

  static TextStyle get displayL => GoogleFonts.instrumentSerif(
        fontSize: 32,
        fontWeight: FontWeight.w400,
        height: 1.2,
        letterSpacing: -0.6,
        color: AppColors.fg1,
      );

  static TextStyle get displayM => GoogleFonts.instrumentSerif(
        fontSize: 28,
        fontWeight: FontWeight.w500,
        height: 1.2,
        letterSpacing: -0.3,
        color: AppColors.fg1,
      );

  static TextStyle get displayXLItalic => displayXL.copyWith(fontStyle: FontStyle.italic);
  static TextStyle get displayLItalic  => displayL.copyWith(fontStyle: FontStyle.italic);
  static TextStyle get displayMItalic  => displayM.copyWith(fontStyle: FontStyle.italic);

  // ── Heading — Plus Jakarta Sans ───────────────────────────────
  static TextStyle get h1 => GoogleFonts.plusJakartaSans(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        height: 1.3,
        letterSpacing: -0.2,
        color: AppColors.fg1,
      );

  static TextStyle get h2 => GoogleFonts.plusJakartaSans(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: AppColors.fg1,
      );

  static TextStyle get h3 => GoogleFonts.plusJakartaSans(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: AppColors.fg1,
      );

  static TextStyle get h4 => GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        height: 1.3,
        color: AppColors.fg1,
      );

  // ── Body — Plus Jakarta Sans ──────────────────────────────────
  static TextStyle get bodyL => GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.6,
        color: AppColors.fg2,
      );

  static TextStyle get bodyM => GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.6,
        color: AppColors.fg3,
      );

  static TextStyle get bodyS => GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.6,
        color: AppColors.fg4,
      );

  // ── UI — Plus Jakarta Sans ────────────────────────────────────
  static TextStyle get buttonL => GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 1.4,
        color: AppColors.fgOnPrimary,
      );

  static TextStyle get buttonM => GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        height: 1.4,
        color: AppColors.fgOnPrimary,
      );

  static TextStyle get label => GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        height: 1.4,
        letterSpacing: 0.5,
        color: AppColors.fg2,
      );

  static TextStyle get overline => GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        height: 1.4,
        letterSpacing: 1.0,
        color: AppColors.fg3,
      );

  // ── Utility helpers ───────────────────────────────────────────
  static TextStyle get quote => GoogleFonts.instrumentSerif(
        fontSize: 18,
        fontWeight: FontWeight.w400,
        fontStyle: FontStyle.italic,
        height: 1.5,
        color: AppColors.fg2,
      );

  static TextStyle get meta => GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w400,
        height: 1.4,
        letterSpacing: 0.2,
        color: AppColors.fg4,
      );

  static TextStyle get eyebrow => GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        height: 1.4,
        letterSpacing: 1.0,
        color: AppColors.biru600,
      ).copyWith(
        // uppercase handled by TextCapitalization or TextStyle decoration
      );
}
