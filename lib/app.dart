import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/providers/accessibility_provider.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// Contrast-boosting colour matrix applied app-wide when high-contrast mode is
/// on. Stretches every channel around the 128 midpoint by [_contrastFactor],
/// darkening text and deepening borders regardless of how a widget is styled —
/// so it works even for text that hard-codes its colour via AppTextStyles.
const double _contrastFactor = 1.32;
const double _contrastOffset = 128 * (1 - _contrastFactor); // ≈ -41
const ColorFilter _highContrastFilter = ColorFilter.matrix(<double>[
  _contrastFactor, 0, 0, 0, _contrastOffset,
  0, _contrastFactor, 0, 0, _contrastOffset,
  0, 0, _contrastFactor, 0, _contrastOffset,
  0, 0, 0, 1, 0,
]);

class MindraApp extends ConsumerWidget {
  const MindraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final a11y = ref.watch(accessibilityProvider);

    return MaterialApp.router(
      title: 'Mindra',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      locale: const Locale('id', 'ID'),
      supportedLocales: const [Locale('id', 'ID'), Locale('en', 'US')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      builder: (context, child) {
        // 1. Font-size accessibility — override the text scale app-wide.
        Widget app = MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(a11y.fontScaleFactor),
          ),
          child: child!,
        );
        // 2. High-contrast accessibility — boost contrast of the whole UI.
        if (a11y.highContrast) {
          app = ColorFiltered(colorFilter: _highContrastFilter, child: app);
        }
        return app;
      },
    );
  }
}
