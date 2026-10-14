import 'package:flutter/material.dart';

/// Mindra design token colors.
/// Derived from colors_and_type.css — do not invent new values here.
abstract final class AppColors {
  // ── PRIMARY — Biru Tenang ─────────────────────────────────────
  static const biru50  = Color(0xFFEBF2F8);
  static const biru100 = Color(0xFFD1E1EF);
  static const biru200 = Color(0xFFA3C2DE);
  static const biru300 = Color(0xFF75A4CE);
  static const biru400 = Color(0xFF4F87B9);
  static const biru500 = Color(0xFF2E6DA4); // primary brand
  static const biru600 = Color(0xFF245785);
  static const biru700 = Color(0xFF1B4267);
  static const biru800 = Color(0xFF132E48);
  static const biru900 = Color(0xFF0B1B2C);

  // ── SECONDARY — Hijau Sage ────────────────────────────────────
  static const sage50  = Color(0xFFEEF6F4);
  static const sage100 = Color(0xFFD4E9E4);
  static const sage200 = Color(0xFFA9D3C9);
  static const sage300 = Color(0xFF7EBDAE);
  static const sage400 = Color(0xFF61AE9D);
  static const sage500 = Color(0xFF4A9E8F); // secondary brand
  static const sage600 = Color(0xFF3B7E72);
  static const sage700 = Color(0xFF2D5F56);
  static const sage800 = Color(0xFF1F4039);
  static const sage900 = Color(0xFF11231F);

  // ── NEUTRAL — Abu Hangat ─────────────────────────────────────
  static const neutral50  = Color(0xFFF8F7F5); // app canvas
  static const neutral100 = Color(0xFFEFEDE9);
  static const neutral200 = Color(0xFFDFDBD3);
  static const neutral300 = Color(0xFFCDC8BD);
  static const neutral400 = Color(0xFFA8A299);
  static const neutral500 = Color(0xFF837D74);
  static const neutral600 = Color(0xFF635E55);
  static const neutral700 = Color(0xFF44403A);
  static const neutral800 = Color(0xFF2D2B28);
  static const neutral900 = Color(0xFF1A1A2E); // deepest ink

  // ── ACCENT — Kuning Matahari ──────────────────────────────────
  static const matahari50  = Color(0xFFFDF3E5);
  static const matahari100 = Color(0xFFFBE2BD);
  static const matahari200 = Color(0xFFF7C57A);
  static const matahari300 = Color(0xFFF1A53A);
  static const matahari400 = Color(0xFFE78F1A);
  static const matahari500 = Color(0xFFE07B00); // accent
  static const matahari600 = Color(0xFFB36100);
  static const matahari700 = Color(0xFF864800);
  static const matahari800 = Color(0xFF5A3000);
  static const matahari900 = Color(0xFF2E1800);

  // ── SEMANTIC — Success ────────────────────────────────────────
  static const success50  = Color(0xFFEAF5EE);
  static const success100 = Color(0xFFC8E4D2);
  static const success200 = Color(0xFF94CAA8);
  static const success300 = Color(0xFF5FAE7E);
  static const success500 = Color(0xFF2E8B57);
  static const success700 = Color(0xFF1F5E3B);
  static const success900 = Color(0xFF0F2F1D);

  // ── SEMANTIC — Warning (same anchor as matahari) ──────────────
  static const warning50  = Color(0xFFFDF3E5);
  static const warning100 = Color(0xFFFBE2BD);
  static const warning200 = Color(0xFFF7C57A);
  static const warning500 = Color(0xFFE07B00);
  static const warning700 = Color(0xFF864800);
  static const warning900 = Color(0xFF2E1800);

  // ── SEMANTIC — Danger (soft red; crisis/error only) ───────────
  static const danger50  = Color(0xFFFBE9E7);
  static const danger100 = Color(0xFFF4C7C2);
  static const danger200 = Color(0xFFE89A92);
  static const danger300 = Color(0xFFDC6C61);
  static const danger500 = Color(0xFFC0392B);
  static const danger700 = Color(0xFF832720);
  static const danger900 = Color(0xFF3F120E);

  // ── SEMANTIC — Info ───────────────────────────────────────────
  static const info50  = Color(0xFFEAF5FD);
  static const info100 = Color(0xFFC6E3F5);
  static const info200 = Color(0xFF8DC7EC);
  static const info300 = Color(0xFF55ABE2);
  static const info500 = Color(0xFF3498DB);
  static const info700 = Color(0xFF1F6FA8);
  static const info900 = Color(0xFF0F3A58);

  // ── MOOD PALETTE — 7-level tracker ───────────────────────────
  static const moodSangatBaik  = Color(0xFFFFD700);
  static const moodBaik        = Color(0xFF90EE90);
  static const moodCukup       = Color(0xFF87CEEB);
  static const moodNetral      = Color(0xFFDDA0DD);
  static const moodKurang      = Color(0xFFFFA07A);
  static const moodBuruk       = Color(0xFFCD853F);
  static const moodSangatBuruk = Color(0xFF708090);

  // Legacy mood glyphs (mapped to ui glyph assets)
  static const moodTenang  = Color(0xFF75A4CE);
  static const moodSyukur  = Color(0xFF7EBDAE);
  static const moodBahagia = Color(0xFFE7B860);
  static const moodHangat  = Color(0xFFE08862);
  static const moodLelah   = Color(0xFFA39BB5);
  static const moodSedih   = Color(0xFF6B89A8);
  static const moodCemas   = Color(0xFFB58A6E);

  // ── SEMANTIC SURFACE / FOREGROUND / BORDER ────────────────────
  static const surfaceCanvas  = neutral50;
  static const surfaceRaised  = Color(0xFFFFFFFF); // cards
  static const surfaceSunken  = neutral100;
  static const surfaceInverse = neutral900;
  static const surfaceTint    = biru50;

  static const fg1 = neutral900; // headings
  static const fg2 = neutral700; // body
  static const fg3 = neutral600; // secondary
  static const fg4 = neutral500; // muted/meta
  static const fgOnPrimary = Color(0xFFFFFFFF);
  static const fgOnDark    = neutral50;

  static const borderSoft   = neutral200;
  static const borderMedium = neutral300;
  static const borderStrong = neutral400;

  // Warm coral accent (legacy)
  static const hangat100 = Color(0xFFFBE9DF);
  static const hangat300 = Color(0xFFF1B89C);
  static const hangat500 = Color(0xFFE08862);
  static const hangat700 = Color(0xFFB5613E);

  // ── SURFACE ALIASES (design-spec names) ──────────────────────
  static const surfaceCard       = surfaceRaised;  // #FFFFFF (cards)
  static const backgroundPrimary = surfaceCanvas;  // #F8F7F5 (app bg)

  // ── MOOD PALETTE — English aliases (design-spec names) ───────
  static const moodGreat    = moodSangatBaik;   // #FFD700
  static const moodGood     = moodBaik;         // #90EE90
  static const moodOkay     = moodCukup;        // #87CEEB
  static const moodNeutral  = moodNetral;       // #DDA0DD
  static const moodLow      = moodKurang;       // #FFA07A
  static const moodBad      = moodBuruk;        // #CD853F
  static const moodTerrible = moodSangatBuruk;  // #708090
}
