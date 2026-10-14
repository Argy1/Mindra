/// Mindra spacing tokens — 4px base grid.
abstract final class AppSpacing {
  static const s0  = 0.0;
  static const s1  = 4.0;
  static const s2  = 8.0;
  static const s3  = 12.0;
  static const s4  = 16.0;
  static const s5  = 20.0;
  static const s6  = 24.0;
  static const s7  = 32.0;
  static const s8  = 40.0;
  static const s9  = 48.0;
  static const s10 = 64.0;
  static const s11 = 80.0;
  static const s12 = 96.0;

  // Named aliases
  static const xs   = s2;  // 8
  static const sm   = s3;  // 12
  static const md   = s4;  // 16
  static const lg   = s5;  // 20
  static const xl   = s6;  // 24
  static const xxl  = s7;  // 32
  static const xxxl = s9;  // 48

  // Layout
  static const screenPadding    = s5;  // 20 — mobile side margin
  static const sectionGap       = s6;  // 24 — between unrelated blocks
  static const relatedGap       = s4;  // 16 — between related blocks
  static const cardPadding      = s4;  // 16
  static const cardInnerGap     = s2;  // 8
  static const minTouchTarget   = 44.0;
  static const bottomNavHeight  = 64.0;
  static const safeAreaBottom   = 16.0;
}

/// Mindra corner radii — generous, pebble-like.
abstract final class AppRadius {
  static const xs   = 6.0;
  static const sm   = 10.0;
  static const md   = 14.0;
  static const lg   = 20.0;
  static const xl   = 28.0;
  static const xxl  = 36.0;
  static const pill = 999.0;

  // Semantic
  static const button  = pill;  // pill buttons by default
  static const card    = lg;    // 20px standard card
  static const cardHero = xl;   // 28px hero card
  static const input   = md;    // 14px input fields
  static const tag     = sm;    // 10px tiny tags
  static const modal   = xxl;   // 36px — top corners only
}
