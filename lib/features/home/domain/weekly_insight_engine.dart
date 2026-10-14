import 'entities/weekly_insight_entity.dart';

/// Pure, dependency-free rule engine for the Weekly Insight feature.
///
/// All methods are deterministic functions of their inputs — no Supabase, no
/// I/O — so the narrative, pattern detection, recommendation and badge logic
/// can be unit-tested in isolation. [WeeklyInsightRepositoryImpl] fetches the
/// raw data and delegates every computation here.
abstract final class WeeklyInsightEngine {
  // ── Mood score mapping ──────────────────────────────────────────────────────

  /// Maps a mood-type string to a 1–5 score (5 = best).
  static int moodTypeToScore(String moodType) => switch (moodType) {
        'bahagia' || 'syukur' => 5,
        'tenang' || 'hangat' => 4,
        'lelah' => 3,
        'cemas' => 2,
        'sedih' => 1,
        _ => 3,
      };

  // ── Trend detection ─────────────────────────────────────────────────────────

  /// Compares the average of the first half of the week's scored days against
  /// the second half. A swing greater than 0.5 points marks a rising/falling
  /// trend. Needs at least 3 scored days, otherwise [MoodTrend.insufficient].
  static MoodTrend computeMoodTrend(List<DayMoodPoint> points) {
    final scored = points.where((p) => p.score != null).toList();
    if (scored.length < 3) return MoodTrend.insufficient;

    final first = scored.take(scored.length ~/ 2).map((p) => p.score!);
    final last = scored.skip(scored.length ~/ 2).map((p) => p.score!);
    final avgFirst = first.reduce((a, b) => a + b) / first.length;
    final avgLast = last.reduce((a, b) => a + b) / last.length;

    if (avgLast - avgFirst > 0.5) return MoodTrend.rising;
    if (avgFirst - avgLast > 0.5) return MoodTrend.falling;
    return MoodTrend.stable;
  }

  /// First-half vs second-half average sleep quality (1–5 scale).
  static SleepTrend computeSleepTrend(List<int> qualities) {
    if (qualities.length < 3) return SleepTrend.insufficient;
    final half = qualities.length ~/ 2;

    double avg(Iterable<int> xs) =>
        xs.map((q) => q.toDouble()).reduce((a, b) => a + b) / xs.length;

    final first = avg(qualities.take(half));
    final last = avg(qualities.skip(half));

    if (last - first > 0.5) return SleepTrend.rising;
    if (first - last > 0.5) return SleepTrend.falling;
    return SleepTrend.stable;
  }

  // ── Narrative engine ────────────────────────────────────────────────────────

  /// Builds the human-readable weekly summary from aggregated metrics.
  /// Layered: mood lead-in → sleep → trend → activity.
  static String buildNarrative({
    required double? avgMood,
    required MoodTrend moodTrend,
    required double? avgSleep,
    required int moodCount,
    required int cbt,
    required int assessments,
    required int reflections,
  }) {
    if (moodCount == 0) {
      return 'Belum ada data perasaan minggu ini. '
          'Mulai check-in harian untuk melihat laporanmu.';
    }

    final sb = StringBuffer();

    if (avgMood != null && avgMood >= 4.0) {
      sb.write('Minggu yang cukup menyenangkan untukmu. ');
    } else if (avgMood != null && avgMood >= 3.0) {
      sb.write('Ada naik-turun perasaan minggu ini — itu wajar. ');
    } else if (avgMood != null) {
      sb.write(
          'Sepertinya minggu ini cukup berat. Kamu sudah bertahan — itu kekuatan. ');
    }

    if (avgSleep != null && avgSleep >= 7) {
      sb.write('Tidurmu cukup baik (${avgSleep.toStringAsFixed(1)} jam). ');
    } else if (avgSleep != null && avgSleep < 6) {
      sb.write(
          'Tidurmu kurang dari ideal minggu ini (${avgSleep.toStringAsFixed(1)} jam). ');
    }

    if (moodTrend == MoodTrend.rising) {
      sb.write('Kondisimu tampak membaik menjelang akhir minggu. ');
    } else if (moodTrend == MoodTrend.falling) {
      sb.write(
          'Perasaanmu menurun di akhir minggu — perhatikan apa yang perlu kamu rawat. ');
    }

    if (cbt >= 3) {
      sb.write('Kamu aktif berlatih teknik kesehatan mental. Luar biasa!');
    } else if (reflections >= 5) {
      sb.write('Refleksi harianmu konsisten — itu bentuk perawatan diri.');
    } else if (assessments >= 1) {
      sb.write('Langkah baik dengan menyelesaikan asesmen minggu ini.');
    }

    final result = sb.toString().trim();
    return result.isEmpty
        ? 'Kamu hadir dan mencatat perasaanmu minggu ini. Itu sudah berarti.'
        : result;
  }

  // ── Pattern insights ────────────────────────────────────────────────────────

  /// Detects up to 3 actionable patterns. The first rule is the core
  /// mood↔sleep correlation: enough good-quality sleep alongside a healthy
  /// average mood is surfaced as a positive, reinforcing insight.
  static List<String> buildPatterns({
    required double? avgMood,
    required MoodTrend moodTrend,
    required double? avgSleep,
    required int goodSleepNights,
    required int cbt,
    required int streak,
  }) {
    final insights = <String>[];

    if (goodSleepNights >= 4 && avgMood != null && avgMood >= 3.5) {
      insights.add(
          'Tidur yang cukup tampak berkaitan dengan suasana hatimu yang lebih baik minggu ini.');
    }

    if (streak >= 5) {
      insights.add(
          'Kamu check-in $streak hari berturut-turut! Konsistensi ini sangat bermakna.');
    } else if (streak >= 3) {
      insights.add(
          'Kamu sudah $streak hari berturut-turut mencatat perasaanmu. Jaga terus!');
    }

    if (cbt >= 3) {
      insights.add(
          'Dengan $cbt sesi latihan minggu ini, kamu melatih pikiran secara konsisten.');
    }

    if (moodTrend == MoodTrend.falling && avgMood != null && avgMood < 3.0) {
      insights.add(
          'Mood kamu cenderung menurun. Cobalah bicara dengan seseorang atau lakukan aktivitas ringan.');
    }

    if (avgSleep != null && avgSleep < 5.5) {
      insights.add(
          'Kurang tidur bisa memengaruhi suasana hati. Coba atur jadwal tidur lebih konsisten.');
    }

    return insights.take(3).toList();
  }

  // ── Recommendation ──────────────────────────────────────────────────────────

  /// Returns a single personalized recommendation targeting the weakest area,
  /// or null when nothing stands out.
  static String? buildRecommendation({
    required double? avgMood,
    required double? avgSleep,
    required int assessments,
    required int cbt,
    required int reflections,
  }) {
    if (avgMood != null && avgMood < 2.5) {
      return 'Mood kamu rendah minggu ini. '
          'Pertimbangkan sesi konsultasi dengan psikolog untuk dukungan lebih.';
    }

    if (avgSleep != null && avgSleep < 6) {
      return 'Prioritaskan tidur minggu depan — '
          'tidur 7–8 jam secara konsisten berdampak besar pada kesehatan mental.';
    }

    if (assessments == 0) {
      return 'Kamu belum melakukan asesmen minggu ini. '
          'Asesmen rutin membantu memantau kondisi mentalmu secara objektif.';
    }

    if (cbt == 0 && reflections < 3) {
      return 'Coba satu latihan CBT atau refleksi malam minggu depan — '
          'bahkan 5 menit bisa membuat perbedaan.';
    }

    if (reflections < 3) {
      return 'Refleksi malam hanya butuh 3 menit. '
          'Coba jadikan kebiasaan sebelum tidur minggu ini.';
    }

    return null;
  }

  // ── Badges ──────────────────────────────────────────────────────────────────

  /// Awards achievement badges for the week based on activity thresholds.
  static List<WeeklyBadge> buildBadges({
    required int streak,
    required int goodSleep,
    required int cbt,
    required int assessments,
    required int reflections,
  }) {
    final badges = <WeeklyBadge>[];
    if (streak >= 3) badges.add(WeeklyBadge.streak3);
    if (goodSleep >= 5) badges.add(WeeklyBadge.goodSleep);
    if (cbt >= 3) badges.add(WeeklyBadge.exercise3);
    if (assessments >= 1) badges.add(WeeklyBadge.assessmentDone);
    if (reflections >= 5) badges.add(WeeklyBadge.reflectionComplete);
    return badges;
  }
}
