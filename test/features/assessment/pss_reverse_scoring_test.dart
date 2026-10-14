// Unit tests for PSS-10 reverse scoring.
//
// PSS-10 (Cohen) items 4, 5, 7, 8 are positively worded and must be
// reverse-scored: adjusted = maxOptionValue - rawAnswer. The remaining six
// items are scored directly. AssessmentSession applies this when computing the
// clinical total.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/assessment/data/assessment_model.dart';
import 'package:mindra/features/assessment/presentation/providers/assessment_provider.dart';

void main() {
  late List<Question> pssQuestions;

  setUp(() {
    pssQuestions = Question.seedsFor('pss10');
  });

  /// Drives a full PSS-10 session, answering each question with the value
  /// produced by [valueFor]. Returns the completed session state.
  AssessmentSessionState runSession(int Function(Question q) valueFor) {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final notifier =
        container.read(assessmentSessionProvider('pss10').notifier);
    for (final q in pssQuestions) {
      notifier.answer(q.id, valueFor(q), pssQuestions);
    }
    return container.read(assessmentSessionProvider('pss10'));
  }

  group('PSS-10 question setup', () {
    test('has exactly 10 questions', () {
      expect(pssQuestions, hasLength(10));
    });

    test('items 4, 5, 7, 8 are flagged reverse-scored — and only those', () {
      final reverseIds = pssQuestions
          .where((q) => q.isReverseScored)
          .map((q) => q.id)
          .toSet();
      expect(reverseIds, {'pss10_4', 'pss10_5', 'pss10_7', 'pss10_8'});
    });

    test('each item offers the 5-point 0–4 scale', () {
      for (final q in pssQuestions) {
        expect(q.options.map((o) => o.value), [0, 1, 2, 3, 4]);
        expect(q.maxOptionValue, 4);
      }
    });
  });

  group('PSS-10 reverse scoring', () {
    test(
        'answering the 4 positive items at maximum (4) yields 0, not 16, '
        'when the other items are 0', () {
      // Reverse items at raw 4 → adjusted 4-4 = 0. Direct items at 0.
      final state = runSession((q) => q.isReverseScored ? 4 : 0);
      expect(state.isComplete, isTrue);
      expect(state.score, 0,
          reason: 'reverse items must flip 4→0, total should be 0 not 16');
    });

    test(
        'answering the 4 positive items at minimum (0) yields 16 — '
        'this proves the reverse transform is applied', () {
      // Reverse items at raw 0 → adjusted 4-0 = 4 each → 4×4 = 16.
      final state = runSession((q) => q.isReverseScored ? 0 : 0);
      expect(state.score, 16);
    });

    test('all items at 0 → total 16 (only the 4 reverse items contribute)', () {
      final state = runSession((_) => 0);
      expect(state.score, 16);
    });

    test('all items at maximum (4) → total 24 (6 direct items × 4)', () {
      // Direct items: 6 × 4 = 24. Reverse items: 4 × (4-4) = 0. Total 24.
      final state = runSession((_) => 4);
      expect(state.score, 24);
    });

    test('all items at midpoint (2) → total 20 (scale midpoint, symmetric)', () {
      // Direct: 6×2 = 12. Reverse: 4×(4-2) = 8. Total 20.
      final state = runSession((_) => 2);
      expect(state.score, 20);
    });
  });

  group('PSS-10 session completion', () {
    test('session is not complete until the final question is answered', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier =
          container.read(assessmentSessionProvider('pss10').notifier);
      for (var i = 0; i < pssQuestions.length - 1; i++) {
        notifier.answer(pssQuestions[i].id, 2, pssQuestions);
      }
      expect(
          container.read(assessmentSessionProvider('pss10')).isComplete, isFalse);

      notifier.answer(pssQuestions.last.id, 2, pssQuestions);
      expect(
          container.read(assessmentSessionProvider('pss10')).isComplete, isTrue);
    });

    test('PSS-10 does not raise a crisis flag (no suicidality item)', () {
      final state = runSession((_) => 4);
      expect(state.crisisDetected, isFalse);
    });
  });
}
