/// Mindra typography — canonical file referenced by the design spec.
/// All styles are implemented in app_text_styles.dart; this file
/// re-exports them under AppTypography so both names work.
library;

import 'app_text_styles.dart';
export 'app_text_styles.dart';

// Callers can use either AppTextStyles or AppTypography — they are the same class.
typedef AppTypography = AppTextStyles;
