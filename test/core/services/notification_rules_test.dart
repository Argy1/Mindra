// Unit tests for NotificationRules — the pure decision logic that governs
// when Mindra surfaces supportive local notifications.

import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/core/services/notification_rules.dart';

void main() {
  group('shouldAlertLowMoodPattern — 3 consecutive low days', () {
    test('3 consecutive low days (all ≤3) triggers the alert', () {
      expect(NotificationRules.shouldAlertLowMoodPattern([3, 2, 1]), isTrue);
      expect(NotificationRules.shouldAlertLowMoodPattern([3, 3, 3]), isTrue);
    });

    test('only the 3 most-recent days are considered', () {
      // Early good days, then a 3-day low streak → still alerts.
      expect(
        NotificationRules.shouldAlertLowMoodPattern([7, 6, 5, 2, 2, 1]),
        isTrue,
      );
    });

    test('a recent good day breaks the streak — no alert', () {
      // Newest day is 5 (> threshold) → last three are [2, 2, 5].
      expect(
        NotificationRules.shouldAlertLowMoodPattern([2, 2, 5]),
        isFalse,
      );
    });

    test('a single non-low day inside the window blocks the alert', () {
      expect(
        NotificationRules.shouldAlertLowMoodPattern([1, 4, 1]),
        isFalse,
      );
    });

    test('fewer than 3 data points → never alerts', () {
      expect(NotificationRules.shouldAlertLowMoodPattern([]), isFalse);
      expect(NotificationRules.shouldAlertLowMoodPattern([1]), isFalse);
      expect(NotificationRules.shouldAlertLowMoodPattern([1, 1]), isFalse);
    });

    test('threshold is inclusive at 3 and exclusive above it', () {
      // Score exactly 3 counts as low; score 4 does not.
      expect(NotificationRules.shouldAlertLowMoodPattern([3, 3, 3]), isTrue);
      expect(NotificationRules.shouldAlertLowMoodPattern([3, 3, 4]), isFalse);
    });

    test('a sustained healthy week never alerts', () {
      expect(
        NotificationRules.shouldAlertLowMoodPattern([5, 6, 5, 6, 7]),
        isFalse,
      );
    });
  });

  group('shouldSendDailyCheckinReminder — no duplicate check-in nudge', () {
    test('already checked in today → reminder suppressed', () {
      expect(
        NotificationRules.shouldSendDailyCheckinReminder(
            hasCheckedInToday: true),
        isFalse,
      );
    });

    test('not yet checked in today → reminder is sent', () {
      expect(
        NotificationRules.shouldSendDailyCheckinReminder(
            hasCheckedInToday: false),
        isTrue,
      );
    });
  });

  group('shouldRemindAssessment — every 14 days', () {
    final now = DateTime(2026, 5, 16, 9, 0);

    test('never assessed → always due', () {
      expect(
        NotificationRules.shouldRemindAssessment(
            lastAssessmentAt: null, now: now),
        isTrue,
      );
    });

    test('assessed today → not due', () {
      expect(
        NotificationRules.shouldRemindAssessment(
            lastAssessmentAt: now, now: now),
        isFalse,
      );
    });

    test('13 days ago → not yet due', () {
      expect(
        NotificationRules.shouldRemindAssessment(
          lastAssessmentAt: now.subtract(const Duration(days: 13)),
          now: now,
        ),
        isFalse,
      );
    });

    test('exactly 14 days ago → due (interval is inclusive)', () {
      expect(
        NotificationRules.shouldRemindAssessment(
          lastAssessmentAt: now.subtract(const Duration(days: 14)),
          now: now,
        ),
        isTrue,
      );
    });

    test('long overdue → due', () {
      expect(
        NotificationRules.shouldRemindAssessment(
          lastAssessmentAt: now.subtract(const Duration(days: 60)),
          now: now,
        ),
        isTrue,
      );
    });
  });
}
