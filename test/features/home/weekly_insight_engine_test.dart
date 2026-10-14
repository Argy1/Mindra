// Unit tests for WeeklyInsightEngine — the pure rule engine behind the
// Weekly Insight dashboard. Covers mood/sleep trend detection, the mood↔sleep
// correlation insight, narrative generation, recommendations and badges.

import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/home/domain/entities/weekly_insight_entity.dart';
import 'package:mindra/features/home/domain/weekly_insight_engine.dart';

/// Builds a 7-day list of mood points from a list of scores (null = no entry).
List<DayMoodPoint> weekOf(List<int?> scores) {
  assert(scores.length == 7);
  final monday = DateTime(2026, 5, 11); // a Monday
  return [
    for (var i = 0; i < 7; i++)
      DayMoodPoint(
        date: monday.add(Duration(days: i)),
        dayLabel: 'H${i + 1}',
        score: scores[i],
      ),
  ];
}

void main() {
  group('moodTypeToScore', () {
    test('maps the 7 mood types onto the 1–5 scale', () {
      expect(WeeklyInsightEngine.moodTypeToScore('bahagia'), 5);
      expect(WeeklyInsightEngine.moodTypeToScore('syukur'), 5);
      expect(WeeklyInsightEngine.moodTypeToScore('tenang'), 4);
      expect(WeeklyInsightEngine.moodTypeToScore('hangat'), 4);
      expect(WeeklyInsightEngine.moodTypeToScore('lelah'), 3);
      expect(WeeklyInsightEngine.moodTypeToScore('cemas'), 2);
      expect(WeeklyInsightEngine.moodTypeToScore('sedih'), 1);
    });

    test('unknown mood type falls back to neutral (3)', () {
      expect(WeeklyInsightEngine.moodTypeToScore('???'), 3);
    });
  });

  group('computeMoodTrend (7 days of mood data)', () {
    test('rising — second half clearly higher than first', () {
      final week = weekOf([1, 1, 2, 4, 5, 5, 5]);
      expect(WeeklyInsightEngine.computeMoodTrend(week), MoodTrend.rising);
    });

    test('falling — second half clearly lower than first', () {
      final week = weekOf([5, 5, 5, 4, 2, 1, 1]);
      expect(WeeklyInsightEngine.computeMoodTrend(week), MoodTrend.falling);
    });

    test('stable — flat week', () {
      final week = weekOf([3, 3, 3, 3, 3, 3, 3]);
      expect(WeeklyInsightEngine.computeMoodTrend(week), MoodTrend.stable);
    });

    test('insufficient — fewer than 3 days logged', () {
      final week = weekOf([4, null, null, 4, null, null, null]);
      expect(
          WeeklyInsightEngine.computeMoodTrend(week), MoodTrend.insufficient);
    });

    test('ignores days with no entry when computing the trend', () {
      // Only 4 logged days: [2,2] then [5,5] → rising.
      final week = weekOf([2, null, 2, null, 5, null, 5]);
      expect(WeeklyInsightEngine.computeMoodTrend(week), MoodTrend.rising);
    });
  });

  group('computeSleepTrend (7 days of sleep data)', () {
    test('rising sleep quality', () {
      expect(
        WeeklyInsightEngine.computeSleepTrend([2, 2, 2, 4, 4, 5, 5]),
        SleepTrend.rising,
      );
    });

    test('falling sleep quality', () {
      expect(
        WeeklyInsightEngine.computeSleepTrend([5, 5, 4, 4, 2, 2, 2]),
        SleepTrend.falling,
      );
    });

    test('stable sleep quality', () {
      expect(
        WeeklyInsightEngine.computeSleepTrend([3, 3, 3, 3, 3, 3, 3]),
        SleepTrend.stable,
      );
    });

    test('insufficient with fewer than 3 nights', () {
      expect(
        WeeklyInsightEngine.computeSleepTrend([4, 5]),
        SleepTrend.insufficient,
      );
    });
  });

  group('buildPatterns — mood↔sleep correlation', () {
    const correlation =
        'Tidur yang cukup tampak berkaitan dengan suasana hatimu yang lebih baik minggu ini.';

    test('good sleep + healthy mood surfaces the correlation insight', () {
      // 7 days: 6 good-quality sleep nights, average mood 4.2.
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 4.2,
        moodTrend: MoodTrend.stable,
        avgSleep: 7.5,
        goodSleepNights: 6,
        cbt: 0,
        streak: 2,
      );
      expect(patterns, contains(correlation));
    });

    test('too few good-sleep nights → no correlation insight', () {
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 4.2,
        moodTrend: MoodTrend.stable,
        avgSleep: 7.5,
        goodSleepNights: 3, // below the 4-night threshold
        cbt: 0,
        streak: 0,
      );
      expect(patterns, isNot(contains(correlation)));
    });

    test('low average mood → no (positive) correlation insight', () {
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 3.0, // below the 3.5 threshold
        moodTrend: MoodTrend.stable,
        avgSleep: 7.5,
        goodSleepNights: 6,
        cbt: 0,
        streak: 0,
      );
      expect(patterns, isNot(contains(correlation)));
    });

    test('falling mood + low average raises a gentle alert insight', () {
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 2.4,
        moodTrend: MoodTrend.falling,
        avgSleep: 6.5,
        goodSleepNights: 1,
        cbt: 0,
        streak: 0,
      );
      expect(patterns.any((p) => p.contains('cenderung menurun')), isTrue);
    });

    test('short sleep raises a sleep-hygiene insight', () {
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 3.2,
        moodTrend: MoodTrend.stable,
        avgSleep: 5.0, // below 5.5
        goodSleepNights: 0,
        cbt: 0,
        streak: 0,
      );
      expect(patterns.any((p) => p.contains('Kurang tidur')), isTrue);
    });

    test('never returns more than 3 insights', () {
      final patterns = WeeklyInsightEngine.buildPatterns(
        avgMood: 4.5,
        moodTrend: MoodTrend.falling,
        avgSleep: 5.0,
        goodSleepNights: 6,
        cbt: 5,
        streak: 7,
      );
      expect(patterns.length, lessThanOrEqualTo(3));
    });

    test('streak ≥5 yields a stronger consistency message than streak 3', () {
      final strong = WeeklyInsightEngine.buildPatterns(
        avgMood: 3.0,
        moodTrend: MoodTrend.stable,
        avgSleep: 6.5,
        goodSleepNights: 0,
        cbt: 0,
        streak: 6,
      );
      expect(strong.any((p) => p.contains('6 hari berturut-turut')), isTrue);
    });
  });

  group('buildNarrative', () {
    test('no mood data → prompts the user to start checking in', () {
      final narrative = WeeklyInsightEngine.buildNarrative(
        avgMood: null,
        moodTrend: MoodTrend.insufficient,
        avgSleep: null,
        moodCount: 0,
        cbt: 0,
        assessments: 0,
        reflections: 0,
      );
      expect(narrative, contains('Belum ada data perasaan'));
    });

    test('good week layers mood + sleep + trend + activity', () {
      final narrative = WeeklyInsightEngine.buildNarrative(
        avgMood: 4.5,
        moodTrend: MoodTrend.rising,
        avgSleep: 7.5,
        moodCount: 7,
        cbt: 3,
        assessments: 1,
        reflections: 6,
      );
      expect(narrative, contains('menyenangkan'));
      expect(narrative, contains('Tidurmu cukup baik'));
      expect(narrative, contains('membaik'));
      expect(narrative, contains('aktif berlatih'));
    });

    test('hard week opens with a compassionate, validating line', () {
      final narrative = WeeklyInsightEngine.buildNarrative(
        avgMood: 1.8,
        moodTrend: MoodTrend.falling,
        avgSleep: 5.0,
        moodCount: 7,
        cbt: 0,
        assessments: 0,
        reflections: 0,
      );
      expect(narrative, contains('cukup berat'));
      expect(narrative, contains('kekuatan'));
    });
  });

  group('buildRecommendation — targets the weakest area', () {
    test('very low mood → recommends a psychologist consultation', () {
      final rec = WeeklyInsightEngine.buildRecommendation(
        avgMood: 2.0,
        avgSleep: 7.0,
        assessments: 1,
        cbt: 1,
        reflections: 5,
      );
      expect(rec, contains('psikolog'));
    });

    test('short sleep → recommends prioritizing sleep', () {
      final rec = WeeklyInsightEngine.buildRecommendation(
        avgMood: 4.0,
        avgSleep: 5.0,
        assessments: 1,
        cbt: 1,
        reflections: 5,
      );
      expect(rec, contains('tidur'));
    });

    test('no assessment this week → recommends taking one', () {
      final rec = WeeklyInsightEngine.buildRecommendation(
        avgMood: 4.0,
        avgSleep: 7.5,
        assessments: 0,
        cbt: 2,
        reflections: 5,
      );
      expect(rec, contains('asesmen'));
    });

    test('a well-rounded week yields no nagging recommendation', () {
      final rec = WeeklyInsightEngine.buildRecommendation(
        avgMood: 4.2,
        avgSleep: 7.5,
        assessments: 1,
        cbt: 3,
        reflections: 6,
      );
      expect(rec, isNull);
    });
  });

  group('buildBadges', () {
    test('a strong week earns every badge', () {
      final badges = WeeklyInsightEngine.buildBadges(
        streak: 7,
        goodSleep: 6,
        cbt: 4,
        assessments: 2,
        reflections: 6,
      );
      expect(badges, containsAll(<WeeklyBadge>[
        WeeklyBadge.streak3,
        WeeklyBadge.goodSleep,
        WeeklyBadge.exercise3,
        WeeklyBadge.assessmentDone,
        WeeklyBadge.reflectionComplete,
      ]));
    });

    test('a quiet week earns no badges', () {
      final badges = WeeklyInsightEngine.buildBadges(
        streak: 2,
        goodSleep: 4,
        cbt: 2,
        assessments: 0,
        reflections: 4,
      );
      expect(badges, isEmpty);
    });

    test('thresholds are inclusive at the boundary', () {
      final badges = WeeklyInsightEngine.buildBadges(
        streak: 3,
        goodSleep: 5,
        cbt: 3,
        assessments: 1,
        reflections: 5,
      );
      expect(badges, hasLength(5));
    });
  });
}
