import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_satusehat_consent_dialog.dart';
import '../../../../shared/widgets/mn_score_gauge.dart';
import '../../data/assessment_model.dart';
import '../../data/assessment_repository.dart';
import '../providers/assessment_provider.dart';

class AssessmentDetailScreen extends ConsumerWidget {
  const AssessmentDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(assessmentDetailProvider(id));
    final questionsAsync = ref.watch(assessmentQuestionsProvider(id));
    final session = ref.watch(assessmentSessionProvider(id));

    return detailAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Gagal memuat asesmen.')),
      ),
      data: (assessment) => questionsAsync.when(
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (_, __) => Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('Gagal memuat pertanyaan.')),
        ),
        data: (questions) {
          if (session.isComplete) {
            return _ResultScreen(
              assessment: assessment!,
              session: session,
              questions: questions,
              onRetake: () =>
                  ref.read(assessmentSessionProvider(id).notifier).reset(),
            );
          }
          return _QuestionScreen(
            assessment: assessment!,
            questions: questions,
            session: session,
            sessionNotifier: ref.read(assessmentSessionProvider(id).notifier),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Question screen
// ─────────────────────────────────────────────────────────────────────────────

class _QuestionScreen extends StatelessWidget {
  const _QuestionScreen({
    required this.assessment,
    required this.questions,
    required this.session,
    required this.sessionNotifier,
  });

  final Assessment assessment;
  final List<Question> questions;
  final AssessmentSessionState session;
  final AssessmentSession sessionNotifier;

  @override
  Widget build(BuildContext context) {
    final q = questions[session.currentIndex];
    final total = questions.length;
    final progress = (session.currentIndex + 1) / total;
    final selectedValue = session.answers[q.id];

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          color: AppColors.fg1,
          onPressed: () {
            if (session.currentIndex > 0) {
              sessionNotifier.previous();
            } else {
              context.pop();
            }
          },
        ),
        title: Text(
          assessment.title,
          style: AppTextStyles.label.copyWith(color: AppColors.fg2),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: progress,
            backgroundColor: AppColors.neutral100,
            color: AppColors.biru500,
            minHeight: 3,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    '${session.currentIndex + 1} / $total',
                    style: AppTextStyles.overline,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _promptFor(assessment.id),
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    q.text,
                    style: AppTextStyles.h3.copyWith(height: 1.5),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  ...q.options.map(
                    (opt) => _OptionTile(
                      label: opt.label,
                      isSelected: selectedValue == opt.value,
                      onTap: () =>
                          sessionNotifier.answer(q.id, opt.value, questions),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _promptFor(String instrumentId) => switch (instrumentId) {
        'phq9' || 'gad7' => 'Dalam 2 minggu terakhir, seberapa sering kamu:',
        'pss10' => 'Dalam sebulan terakhir:',
        'srq20' => 'Dalam 30 hari terakhir:',
        _ => 'Pilih jawaban yang paling sesuai:',
      };
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.biru50 : AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: isSelected ? AppColors.biru400 : AppColors.borderSoft,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? AppColors.biru500 : Colors.transparent,
                border: Border.all(
                  color: isSelected ? AppColors.biru500 : AppColors.neutral300,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: AppTextStyles.bodyM.copyWith(
                  color: isSelected ? AppColors.biru700 : AppColors.fg1,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Result screen — uses clinical thresholds + crisis banner + recommendations
// ─────────────────────────────────────────────────────────────────────────────

class _ResultScreen extends ConsumerStatefulWidget {
  const _ResultScreen({
    required this.assessment,
    required this.session,
    required this.questions,
    required this.onRetake,
  });

  final Assessment assessment;
  final AssessmentSessionState session;
  final List<Question> questions;
  final VoidCallback onRetake;

  @override
  ConsumerState<_ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<_ResultScreen> {
  bool _saved = false;
  bool _isSaving = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    // Auto-save once when the result screen is first shown.
    WidgetsBinding.instance.addPostFrameCallback((_) => _saveResult());
  }

  Future<void> _saveResult() async {
    if (_saved || _isSaving) return;
    if (mounted) {
      setState(() {
        _isSaving = true;
        _saveError = null;
      });
    }
    _saved = true;
    final userId = ref.read(supabaseProvider).auth.currentUser?.id;
    if (userId == null) {
      _saved = false;
      if (mounted) {
        setState(() {
          _isSaving = false;
          _saveError = 'Silakan login ulang untuk menyimpan hasil asesmen.';
        });
      }
      return;
    }
    final score = widget.session.score ?? 0;
    final repo = ref.read(assessmentRepositoryProvider);
    try {
      final saved = await repo.saveResult(
        userId: userId,
        instrumentType: widget.assessment.id,
        answers: widget.session.answers,
        totalScore: score,
        category: AssessmentClinical.categoryEnglish(
          widget.assessment.id,
          score,
        ),
      );

      if (mounted) {
        setState(() => _isSaving = false);
      }

      // Ask consent to forward to SATUSEHAT after a short delay so the
      // result screen renders first.
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;
      final consent = await showSatusehatConsentDialog(context);
      if (consent == true && mounted) {
        final savedId = saved?['id'] as String?;
        if (savedId == null) return;
        try {
          await repo.markSentToSatusehat(savedId);
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage(
                e,
                fallback: 'Gagal mengirim status SATUSEHAT.',
              )),
              backgroundColor: AppColors.danger500,
            ),
          );
        }
      }
    } catch (e) {
      _saved = false;
      if (mounted) {
        setState(() {
          _isSaving = false;
          _saveError = errorMessage(
            e,
            fallback: 'Gagal menyimpan hasil asesmen.',
          );
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final score = widget.session.score ?? 0;
    final instrumentId = widget.assessment.id;
    final maxScore = AssessmentClinical.maxScoreFor(instrumentId);
    final explanation = AssessmentClinical.explanation(instrumentId, score);
    final recommendations =
        AssessmentClinical.recommendationsFor(instrumentId, score);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.xl),
              Text('Hasil Asesmen', style: AppTextStyles.h2),
              const SizedBox(height: AppSpacing.xs),
              Text(
                widget.assessment.title,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
              ),
              if (_isSaving) ...[
                const SizedBox(height: AppSpacing.md),
                const _SaveInfoBanner(),
              ],
              if (_saveError != null) ...[
                const SizedBox(height: AppSpacing.md),
                _SaveErrorBanner(
                  message: _saveError!,
                  onRetry: _saveResult,
                ),
              ],
              const SizedBox(height: AppSpacing.xxl),

              // ── Crisis banner ─────────────────────────────────────────────
              if (widget.session.crisisDetected) ...[
                _CrisisBanner(
                  onTap: () => context.push('/home/crisis'),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],

              // ── Score gauge ───────────────────────────────────────────────
              Center(
                child: MnScoreGauge(
                  score: score,
                  maxScore: maxScore,
                  instrumentId: instrumentId,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // ── Plain-language explanation ────────────────────────────────
              Text('Apa artinya ini?', style: AppTextStyles.h4),
              const SizedBox(height: AppSpacing.sm),
              Text(
                explanation,
                style: AppTextStyles.bodyM.copyWith(height: 1.55),
              ),
              const SizedBox(height: AppSpacing.xl),

              // ── Recommendations ───────────────────────────────────────────
              Text('Rekomendasi untukmu', style: AppTextStyles.h4),
              const SizedBox(height: AppSpacing.sm),
              ...recommendations.map(
                (r) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: _RecommendationCard(rec: r),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // ── Disclaimer ────────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.neutral50,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.borderSoft),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      size: 18,
                      color: AppColors.fg3,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'Hasil ini bukan diagnosis klinis. Gunakan sebagai bahan percakapan dengan tenaga kesehatan jiwa.',
                        style: AppTextStyles.bodyS.copyWith(
                          color: AppColors.fg3,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              MnButton(
                label: 'Kembali ke Asesmen',
                onPressed: () => context.pop(),
              ),
              const SizedBox(height: AppSpacing.sm),
              MnButton(
                label: 'Ulangi Asesmen',
                variant: MnButtonVariant.secondary,
                onPressed: widget.onRetake,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crisis banner — shown when PHQ-9 Q9 > 0 or SRQ-20 Q17 = 1
// ─────────────────────────────────────────────────────────────────────────────

class _SaveInfoBanner extends StatelessWidget {
  const _SaveInfoBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Menyimpan hasil asesmen...',
              style: AppTextStyles.bodyS.copyWith(color: AppColors.biru700),
            ),
          ),
        ],
      ),
    );
  }
}

class _SaveErrorBanner extends StatelessWidget {
  const _SaveErrorBanner({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.danger300),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppColors.danger500,
            size: 18,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodyS.copyWith(color: AppColors.danger700),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Coba lagi'),
          ),
        ],
      ),
    );
  }
}

class _CrisisBanner extends StatelessWidget {
  const _CrisisBanner({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.danger300),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.favorite_rounded,
                color: Color(0xFFB91C1C), size: 22),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kamu tidak sendirian',
                    style: AppTextStyles.bodyM.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFB91C1C),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Beberapa jawabanmu menunjukkan pikiran yang sulit. Bantuan tersedia 24 jam — tekan untuk lihat.',
                    style: AppTextStyles.bodyS.copyWith(
                      color: const Color(0xFF7F1D1D),
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFFB91C1C)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation card
// ─────────────────────────────────────────────────────────────────────────────

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({required this.rec});
  final AssessmentRecommendation rec;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(rec.route),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: rec.highlight ? AppColors.biru50 : AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: rec.highlight ? AppColors.biru300 : AppColors.borderSoft,
            width: rec.highlight ? 1.5 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: rec.highlight ? AppColors.biru500 : AppColors.biru100,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(
                Icons.arrow_outward_rounded,
                color:
                    rec.highlight ? AppColors.fgOnPrimary : AppColors.biru700,
                size: 18,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    rec.title,
                    style: AppTextStyles.bodyM.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.fg1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    rec.description,
                    style: AppTextStyles.bodyS.copyWith(
                      color: AppColors.fg3,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    rec.ctaLabel,
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.biru600,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
