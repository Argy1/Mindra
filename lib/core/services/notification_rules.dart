/// Pure decision rules for Mindra's local notifications.
///
/// Kept separate from [NotificationService] (which performs platform I/O) so
/// the *when-to-notify* logic is deterministic and unit-testable. The service
/// delegates here and only handles scheduling/showing.
abstract final class NotificationRules {
  /// A mood score at or below this value counts as a "low" day.
  /// Mood scores are on a 1–7 scale; ≤3 is the lower third.
  static const int lowMoodThreshold = 3;

  /// Number of consecutive low days that triggers a supportive alert.
  static const int consecutiveLowDaysForAlert = 3;

  /// True when the most recent [consecutiveLowDaysForAlert] mood scores are all
  /// at or below [lowMoodThreshold] — i.e. a sustained low-mood pattern that
  /// warrants a gentle, supportive check-in notification.
  ///
  /// [recentScores] is chronological (oldest → newest). Returns false when
  /// there are not yet enough data points to judge.
  static bool shouldAlertLowMoodPattern(List<int> recentScores) {
    if (recentScores.length < consecutiveLowDaysForAlert) return false;
    final recent =
        recentScores.reversed.take(consecutiveLowDaysForAlert);
    return recent.every((score) => score <= lowMoodThreshold);
  }

  /// True when the daily mood check-in reminder should still be delivered.
  ///
  /// Suppressed once the user has already logged a mood today — there is no
  /// point nudging someone to do something they have already done.
  static bool shouldSendDailyCheckinReminder({
    required bool hasCheckedInToday,
  }) {
    return !hasCheckedInToday;
  }

  /// True when an assessment reminder is due: either the user has never taken
  /// one, or the last one was [intervalDays] or more ago.
  static bool shouldRemindAssessment({
    required DateTime? lastAssessmentAt,
    required DateTime now,
    int intervalDays = 14,
  }) {
    if (lastAssessmentAt == null) return true;
    return now.difference(lastAssessmentAt).inDays >= intervalDays;
  }
}
