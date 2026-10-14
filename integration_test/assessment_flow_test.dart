// Integration test — PHQ-9 assessment flow end-to-end.
//
// Drives the real AssessmentDetailScreen (providers + screens + scoring +
// AssessmentClinical) from the first question through to the result screen,
// and verifies the computed clinical score and crisis detection.
//
// Run on a device/emulator:
//   flutter test integration_test/assessment_flow_test.dart
//
// supabaseProvider is overridden with a session-less SupabaseClient so the
// result screen's auto-save short-circuits (currentUser == null) — the flow is
// exercised without any network call or live Supabase project.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:mindra/core/providers/supabase_provider.dart';
import 'package:mindra/features/assessment/presentation/providers/assessment_provider.dart';
import 'package:mindra/features/assessment/presentation/screens/assessment_detail_screen.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late SupabaseClient fakeClient;

  setUpAll(() {
    fakeClient = SupabaseClient('https://demo.supabase.co', 'demo-anon-key');
  });

  /// Boots the PHQ-9 detail screen and returns its ProviderContainer.
  Future<ProviderContainer> bootPhq9(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [supabaseProvider.overrideWithValue(fakeClient)],
        child: const MaterialApp(home: AssessmentDetailScreen(id: 'phq9')),
      ),
    );
    await tester.pumpAndSettle();
    return ProviderScope.containerOf(
      tester.element(find.byType(AssessmentDetailScreen)),
    );
  }

  testWidgets(
    'completes PHQ-9 from the first question to the result screen '
    'and computes the correct score',
    (tester) async {
      final container = await bootPhq9(tester);

      // The flow opens on question 1 of 9.
      expect(find.text('1 / 9'), findsOneWidget);

      // Answer Q1–Q8 "Beberapa hari" (1) and Q9 "Sama sekali tidak" (0)
      // → clinical total = 8.
      for (var i = 1; i <= 9; i++) {
        expect(find.text('$i / 9'), findsOneWidget,
            reason: 'expected to be on question $i');
        final answer = i < 9 ? 'Beberapa hari' : 'Sama sekali tidak';
        await tester.tap(find.text(answer));
        await tester.pumpAndSettle();
      }

      // Session state — score computed by AssessmentSession.
      final session = container.read(assessmentSessionProvider('phq9'));
      expect(session.isComplete, isTrue);
      expect(session.score, 8);
      expect(session.crisisDetected, isFalse);

      // Score → category pipeline (8 → mild / Ringan).
      expect(
        AssessmentClinical.categoryEnglish('phq9', session.score!),
        'mild',
      );
      expect(
        AssessmentClinical.labelIndonesian('phq9', session.score!),
        'Ringan',
      );

      // The result screen has rendered.
      expect(find.text('Hasil Asesmen'), findsOneWidget);
      expect(find.text('Rekomendasi untukmu'), findsOneWidget);
    },
  );

  testWidgets(
    'a non-zero answer on PHQ-9 item 9 raises the supportive crisis banner',
    (tester) async {
      final container = await bootPhq9(tester);

      // Answer every item — including Q9 (suicidal ideation) — "Beberapa hari".
      for (var i = 1; i <= 9; i++) {
        await tester.tap(find.text('Beberapa hari'));
        await tester.pumpAndSettle();
      }

      final session = container.read(assessmentSessionProvider('phq9'));
      expect(session.score, 9);
      expect(session.crisisDetected, isTrue);

      // The crisis banner is shown above the result.
      expect(find.text('Kamu tidak sendirian'), findsOneWidget);
    },
  );

  testWidgets(
    'going back with the app bar arrow returns to the previous question',
    (tester) async {
      final container = await bootPhq9(tester);

      await tester.tap(find.text('Beberapa hari')); // answer Q1
      await tester.pumpAndSettle();
      expect(find.text('2 / 9'), findsOneWidget);

      // Tap the back arrow → returns to Q1.
      await tester.tap(find.byIcon(Icons.arrow_back_rounded));
      await tester.pumpAndSettle();
      expect(find.text('1 / 9'), findsOneWidget);
      expect(
        container.read(assessmentSessionProvider('phq9')).currentIndex,
        0,
      );
    },
  );
}
