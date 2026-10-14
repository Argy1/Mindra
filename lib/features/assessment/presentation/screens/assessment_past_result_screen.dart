import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_score_gauge.dart';
import '../../data/assessment_model.dart';
import '../../data/assessment_repository.dart';
import '../providers/assessment_provider.dart';

class AssessmentPastResultScreen extends ConsumerWidget {
  const AssessmentPastResultScreen({
    super.key,
    required this.type,
    required this.resultId,
  });

  final String type;
  final String resultId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(assessmentHistoryProvider(type));

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: BackButton(onPressed: () => context.pop()),
        title: Text('Detail Hasil', style: AppTextStyles.h3),
      ),
      body: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Text(
            'Gagal memuat hasil.',
            style: AppTextStyles.bodyM,
          ),
        ),
        data: (history) {
          final result = history.cast<AssessmentResult?>().firstWhere(
                (r) => r?.id == resultId,
                orElse: () => null,
              );
          if (result == null) {
            return Center(
              child: Text(
                'Hasil tidak ditemukan.',
                style: AppTextStyles.bodyM,
              ),
            );
          }
          final latest = history.isNotEmpty ? history.first : null;
          final isLatest = latest?.id == resultId;
          return _ResultBody(
            result: result,
            instrumentId: type,
            latestResult: isLatest ? null : latest,
          );
        },
      ),
    );
  }
}

// ── Body ─────────────────────────────────────────────────────────────────────

class _ResultBody extends StatelessWidget {
  const _ResultBody({
    required this.result,
    required this.instrumentId,
    this.latestResult,
  });

  final AssessmentResult result;
  final String instrumentId;
  final AssessmentResult? latestResult;

  Color _tierColor(int tier) => switch (tier) {
        0 => AppColors.sage500,
        1 => AppColors.biru400,
        2 => AppColors.matahari500,
        _ => AppColors.danger500,
      };

  @override
  Widget build(BuildContext context) {
    final tier = AssessmentClinical.tier(instrumentId, result.totalScore);
    final tierColor = _tierColor(tier);
    final explanation =
        AssessmentClinical.explanation(instrumentId, result.totalScore);
    final maxScore = AssessmentClinical.maxScoreFor(instrumentId);

    final dateStr = DateFormat('EEEE, d MMMM yyyy • HH:mm', 'id_ID')
        .format(result.completedAt.toLocal());

    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.md,
      ),
      children: [
        // ── Instrument badge + date ──────────────────────────────
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.biru100,
                borderRadius: BorderRadius.circular(AppRadius.tag),
              ),
              child: Text(
                instrumentId.toUpperCase(),
                style: AppTextStyles.overline
                    .copyWith(color: AppColors.biru700),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                dateStr,
                style: AppTextStyles.bodyS,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Score gauge ──────────────────────────────────────────
        Center(
          child: MnScoreGauge(
            score: result.totalScore,
            maxScore: maxScore,
            instrumentId: instrumentId,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Comparison with latest ───────────────────────────────
        if (latestResult != null) ...[
          _ComparisonCard(
            instrumentId: instrumentId,
            past: result,
            latest: latestResult!,
            tierColor: tierColor,
          ),
          const SizedBox(height: AppSpacing.xl),
        ],

        // ── Explanation ──────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surfaceRaised,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Interpretasi', style: AppTextStyles.h4),
              const SizedBox(height: AppSpacing.sm),
              Text(explanation, style: AppTextStyles.bodyM),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Answers (if stored) ──────────────────────────────────
        if (result.answers.isNotEmpty) ...[
          Text('Jawaban saat asesmen', style: AppTextStyles.h4),
          const SizedBox(height: AppSpacing.sm),
          _AnswerList(
            instrumentId: instrumentId,
            answers: result.answers,
          ),
          const SizedBox(height: AppSpacing.xl),
        ],

        // ── Disclaimer ───────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.neutral100,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Text(
            'Hasil ini bukan diagnosis klinis. Konsultasikan dengan tenaga kesehatan jiwa untuk penilaian lebih lanjut.',
            style: AppTextStyles.bodyS,
            textAlign: TextAlign.center,
          ),
        ),
        SizedBox(
          height: MediaQuery.of(context).padding.bottom + AppSpacing.xl,
        ),
      ],
    );
  }
}

// ── Comparison card ───────────────────────────────────────────────────────────

class _ComparisonCard extends StatelessWidget {
  const _ComparisonCard({
    required this.instrumentId,
    required this.past,
    required this.latest,
    required this.tierColor,
  });

  final String instrumentId;
  final AssessmentResult past;
  final AssessmentResult latest;
  final Color tierColor;

  @override
  Widget build(BuildContext context) {
    final diff = latest.totalScore - past.totalScore;
    final latestTier =
        AssessmentClinical.tier(instrumentId, latest.totalScore);
    final latestColor = switch (latestTier) {
      0 => AppColors.sage500,
      1 => AppColors.biru400,
      2 => AppColors.matahari500,
      _ => AppColors.danger500,
    };
    final latestLabel =
        AssessmentClinical.labelIndonesian(instrumentId, latest.totalScore);

    IconData trendIcon;
    Color trendColor;
    String trendText;
    if (diff == 0) {
      trendIcon = Icons.remove_rounded;
      trendColor = AppColors.fg3;
      trendText = 'Sama dengan hasil terbaru';
    } else if (diff < 0) {
      trendIcon = Icons.arrow_downward_rounded;
      trendColor = AppColors.sage500;
      trendText = 'Turun ${diff.abs()} poin dari hasil terbaru';
    } else {
      trendIcon = Icons.arrow_upward_rounded;
      trendColor = AppColors.danger500;
      trendText = 'Naik $diff poin dari hasil terbaru';
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Perbandingan dengan terbaru', style: AppTextStyles.h4),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              // This result
              Expanded(
                child: _ScorePill(
                  label: 'Hasil ini',
                  score: past.totalScore,
                  category: AssessmentClinical.labelIndonesian(
                      instrumentId, past.totalScore),
                  color: tierColor,
                ),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                child: Icon(Icons.arrow_forward_rounded,
                    color: AppColors.neutral400, size: 18),
              ),
              // Latest result
              Expanded(
                child: _ScorePill(
                  label: 'Terbaru',
                  score: latest.totalScore,
                  category: latestLabel,
                  color: latestColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Icon(trendIcon, size: 14, color: trendColor),
              const SizedBox(width: 4),
              Text(
                trendText,
                style: AppTextStyles.bodyS.copyWith(color: trendColor),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ScorePill extends StatelessWidget {
  const _ScorePill({
    required this.label,
    required this.score,
    required this.category,
    required this.color,
  });

  final String label;
  final int score;
  final String category;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: AppTextStyles.overline.copyWith(color: color),
          ),
          Text(
            '$score',
            style: AppTextStyles.h2.copyWith(color: color),
          ),
          Text(
            category,
            style: AppTextStyles.bodyS.copyWith(color: color),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ── Answer list ───────────────────────────────────────────────────────────────

class _AnswerList extends StatelessWidget {
  const _AnswerList({
    required this.instrumentId,
    required this.answers,
  });

  final String instrumentId;
  final List<Map<String, dynamic>> answers;

  @override
  Widget build(BuildContext context) {
    final questions = Question.seedsFor(instrumentId);

    return Column(
      children: answers.asMap().entries.map((entry) {
        final idx = entry.key;
        final a = entry.value;
        final qId = a['question_id'] as String? ?? '';
        final score = a['score'] as int? ?? 0;

        final question = questions.cast<Question?>().firstWhere(
              (q) => q?.id == qId,
              orElse: () => null,
            );
        final questionText = question?.text ?? qId;
        final optionText = question?.options
                .cast<QuestionOption?>()
                .firstWhere(
                  (o) => o?.value == score,
                  orElse: () => null,
                )
                ?.label ??
            '$score';

        return Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.xs),
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.surfaceRaised,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.biru100,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${idx + 1}',
                  style: AppTextStyles.overline
                      .copyWith(color: AppColors.biru700),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      questionText,
                      style: AppTextStyles.bodyM
                          .copyWith(color: AppColors.fg2),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      optionText,
                      style: AppTextStyles.label
                          .copyWith(color: AppColors.biru600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
