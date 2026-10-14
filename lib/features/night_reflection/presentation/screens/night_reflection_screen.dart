import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/reflection_entity.dart';
import '../providers/reflection_provider.dart';

class NightReflectionScreen extends ConsumerWidget {
  const NightReflectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draft = ref.watch(reflectionSessionProvider);

    if (draft.isComplete) {
      return _MoodRatingScreen(draft: draft);
    }

    return _QuestionScreen(draft: draft);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Question screen (one question at a time)
// ─────────────────────────────────────────────────────────────────────────────

class _QuestionScreen extends ConsumerStatefulWidget {
  const _QuestionScreen({required this.draft});
  final ReflectionSessionDraft draft;

  @override
  ConsumerState<_QuestionScreen> createState() => _QuestionScreenState();
}

class _QuestionScreenState extends ConsumerState<_QuestionScreen> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.draft.currentAnswer);
  }

  @override
  void didUpdateWidget(_QuestionScreen old) {
    super.didUpdateWidget(old);
    if (old.draft.currentIndex != widget.draft.currentIndex) {
      _ctrl.text = widget.draft.currentAnswer;
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(reflectionSessionProvider);
    final notifier = ref.read(reflectionSessionProvider.notifier);
    final q = draft.currentQuestion;
    final dateStr =
        DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(DateTime.now());
    final hour = DateTime.now().hour;
    final greeting = hour < 5
        ? 'Masih terjaga malam ini?'
        : hour < 12
            ? 'Selamat pagi 🌅'
            : hour < 18
                ? 'Selamat sore 🌤️'
                : 'Selamat malam 🌙';

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, size: 22),
                    onPressed: () => context.pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const Spacer(),
                  Text(
                    '${draft.currentIndex + 1} / ${draft.questions.length}',
                    style: AppTextStyles.label.copyWith(color: AppColors.fg4),
                  ),
                ],
              ),
            ),

            // Progress bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: (draft.currentIndex + 1) / draft.questions.length,
                  minHeight: 4,
                  backgroundColor: AppColors.borderSoft,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _categoryColor(q.category),
                  ),
                ),
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Date + greeting (first question only)
                    if (draft.currentIndex == 0) ...[
                      Text(greeting,
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.fg4)),
                      Text(dateStr,
                          style: AppTextStyles.label
                              .copyWith(color: AppColors.fg4, fontSize: 12)),
                      const SizedBox(height: 24),
                    ],

                    // Category badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color:
                            _categoryColor(q.category).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(q.category.emoji,
                              style: const TextStyle(fontSize: 13)),
                          const SizedBox(width: 5),
                          Text(q.category.label,
                              style: AppTextStyles.label.copyWith(
                                  color: _categoryColor(q.category),
                                  fontSize: 12)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Question text
                    Text(
                      q.text,
                      style: AppTextStyles.h3
                          .copyWith(color: AppColors.fg1, height: 1.45),
                    ),
                    const SizedBox(height: 28),

                    // Answer input
                    TextField(
                      controller: _ctrl,
                      onChanged: (v) => notifier.updateAnswer(v),
                      minLines: 6,
                      maxLines: null,
                      maxLength: 500,
                      style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
                      decoration: InputDecoration(
                        hintText: 'Tuliskan jawabanmu di sini...',
                        hintStyle:
                            AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                        filled: true,
                        fillColor: AppColors.surfaceCard,
                        contentPadding: const EdgeInsets.all(16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide:
                              const BorderSide(color: AppColors.borderSoft),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide:
                              const BorderSide(color: AppColors.borderSoft),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                              color: _categoryColor(q.category), width: 1.5),
                        ),
                        counterStyle: AppTextStyles.label
                            .copyWith(color: AppColors.fg4, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Nav buttons
            Container(
              padding: EdgeInsets.fromLTRB(
                  24, 12, 24, 12 + MediaQuery.of(context).padding.bottom),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                border: Border(top: BorderSide(color: AppColors.borderSoft)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => notifier.skip(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.fg4,
                        side: const BorderSide(color: AppColors.borderMedium),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Lewati'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: () => notifier.next(),
                      style: FilledButton.styleFrom(
                        backgroundColor: _categoryColor(q.category),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: Text(draft.isLastQuestion ? 'Selesai' : 'Lanjut'),
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

  Color _categoryColor(ReflectionCategory category) {
    return switch (category) {
      ReflectionCategory.gratitude => AppColors.matahari500,
      ReflectionCategory.challenges => AppColors.danger500,
      ReflectionCategory.selfCompassion => const Color(0xFFE878A0),
      ReflectionCategory.insight => AppColors.biru500,
      ReflectionCategory.lettingGo => AppColors.sage500,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood rating screen (after all 5 questions)
// ─────────────────────────────────────────────────────────────────────────────

class _MoodRatingScreen extends ConsumerWidget {
  const _MoodRatingScreen({required this.draft});
  final ReflectionSessionDraft draft;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(reflectionSessionProvider.notifier);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              const Text('🌙',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 64)),
              const SizedBox(height: 20),
              Text(
                'Refleksi selesai',
                style: AppTextStyles.h2.copyWith(color: AppColors.fg1),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Kamu telah meluangkan waktu untuk mengenal dirimu lebih dalam. Itu sebuah keberanian.',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 36),
              Text(
                'Bagaimana perasaanmu setelah refleksi ini?',
                style: AppTextStyles.h4.copyWith(color: AppColors.fg1),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MoodButton(
                      emoji: '😔',
                      label: 'Lebih berat',
                      value: 1,
                      selected: draft.moodAfter == 1,
                      onTap: () => notifier.setMoodAfter(1)),
                  _MoodButton(
                      emoji: '😐',
                      label: 'Sama saja',
                      value: 2,
                      selected: draft.moodAfter == 2,
                      onTap: () => notifier.setMoodAfter(2)),
                  _MoodButton(
                      emoji: '🙂',
                      label: 'Sedikit lebih baik',
                      value: 3,
                      selected: draft.moodAfter == 3,
                      onTap: () => notifier.setMoodAfter(3)),
                  _MoodButton(
                      emoji: '😊',
                      label: 'Lebih baik',
                      value: 4,
                      selected: draft.moodAfter == 4,
                      onTap: () => notifier.setMoodAfter(4)),
                  _MoodButton(
                      emoji: '😌',
                      label: 'Jauh lebih tenang',
                      value: 5,
                      selected: draft.moodAfter == 5,
                      onTap: () => notifier.setMoodAfter(5)),
                ],
              ),
              const SizedBox(height: 28),
              if (draft.error != null) ...[
                Text(draft.error!,
                    style: AppTextStyles.bodyM
                        .copyWith(color: AppColors.danger500),
                    textAlign: TextAlign.center),
                const SizedBox(height: 12),
              ],
              FilledButton(
                onPressed: draft.isSaving
                    ? null
                    : () async {
                        if (user != null) {
                          await notifier.save(user.id);
                        }
                        if (context.mounted) context.pop();
                      },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.neutral900,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.borderMedium,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: draft.isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Selesai & Simpan',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: draft.isSaving
                    ? null
                    : () {
                        notifier.reset();
                        context.pop();
                      },
                child: Text('Lewati & Tutup',
                    style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoodButton extends StatelessWidget {
  const _MoodButton({
    required this.emoji,
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });
  final String emoji, label;
  final int value;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 58,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.neutral900 : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.neutral900 : AppColors.borderMedium,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : AppColors.fg4,
                fontSize: 9,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
}
