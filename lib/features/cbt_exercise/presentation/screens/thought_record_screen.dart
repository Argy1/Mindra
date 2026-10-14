import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/exercise_entity.dart';
import '../providers/exercise_provider.dart';

class ThoughtRecordScreen extends ConsumerStatefulWidget {
  const ThoughtRecordScreen({super.key});

  @override
  ConsumerState<ThoughtRecordScreen> createState() =>
      _ThoughtRecordScreenState();
}

class _ThoughtRecordScreenState extends ConsumerState<ThoughtRecordScreen> {
  final _pageCtrl = PageController();
  final _evidenceCtrl = TextEditingController();
  final _counterCtrl = TextEditingController();

  @override
  void dispose() {
    _pageCtrl.dispose();
    _evidenceCtrl.dispose();
    _counterCtrl.dispose();
    super.dispose();
  }

  void _goTo(int step) {
    _pageCtrl.animateToPage(
      step,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(thoughtRecordProvider);
    final notifier = ref.read(thoughtRecordProvider.notifier);

    // Completed state
    if (draft.savedId != null) {
      return _CompletionScreen(
          draft: draft,
          onReset: () {
            notifier.reset();
            context.pop();
          });
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Thought Record', style: AppTextStyles.h3),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(6),
          child: _StepBar(current: draft.currentStep, total: 6),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _pageCtrl,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _Step1Situation(
                  value: draft.situation,
                  onChanged: notifier.setSituation,
                ),
                _Step2Emotions(
                  selected: draft.emotions,
                  onToggle: notifier.toggleEmotion,
                  onIntensity: notifier.setEmotionIntensity,
                ),
                _Step3AutomaticThought(
                  value: draft.automaticThought,
                  onChanged: notifier.setAutomaticThought,
                ),
                _Step4Evidence(
                  items: draft.supportingEvidence,
                  ctrl: _evidenceCtrl,
                  onAdd: (v) {
                    notifier.addSupportingEvidence(v);
                    _evidenceCtrl.clear();
                  },
                  onRemove: notifier.removeSupportingEvidence,
                ),
                _Step5Counter(
                  items: draft.counterEvidence,
                  ctrl: _counterCtrl,
                  onAdd: (v) {
                    notifier.addCounterEvidence(v);
                    _counterCtrl.clear();
                  },
                  onRemove: notifier.removeCounterEvidence,
                ),
                _Step6Balanced(
                  balancedThought: draft.balancedThought,
                  beliefScore: draft.beliefScore,
                  afterEmotions: draft.afterEmotions,
                  onThoughtChanged: notifier.setBalancedThought,
                  onBeliefChanged: notifier.setBeliefScore,
                  onToggleEmotion: notifier.toggleAfterEmotion,
                  onIntensity: notifier.setAfterEmotionIntensity,
                ),
              ],
            ),
          ),
          if (draft.error != null) _InlineErrorBanner(message: draft.error!),
          _NavBar(
            step: draft.currentStep,
            canAdvance: draft.canAdvance,
            isSaving: draft.isSaving,
            onBack: () {
              notifier.prevStep();
              _goTo(draft.currentStep - 1);
            },
            onNext: () {
              if (draft.currentStep == 5) {
                final user = ref.read(currentUserProvider);
                if (user != null) notifier.save(user.id);
              } else {
                notifier.nextStep();
                _goTo(draft.currentStep + 1);
              }
            },
          ),
        ],
      ),
    );
  }
}

// ─── Step bar ────────────────────────────────────────────────────────────────

class _InlineErrorBanner extends StatelessWidget {
  const _InlineErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(12),
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
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodyM.copyWith(color: AppColors.danger700),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepBar extends StatelessWidget {
  const _StepBar({required this.current, required this.total});
  final int current, total;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(total, (i) {
        final done = i < current;
        final active = i == current;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(right: i < total - 1 ? 2 : 0),
            color: done
                ? AppColors.biru500
                : active
                    ? AppColors.biru300
                    : AppColors.borderSoft,
          ),
        );
      }),
    );
  }
}

// ─── Nav bar ─────────────────────────────────────────────────────────────────

class _NavBar extends StatelessWidget {
  const _NavBar({
    required this.step,
    required this.canAdvance,
    required this.isSaving,
    required this.onBack,
    required this.onNext,
  });
  final int step;
  final bool canAdvance, isSaving;
  final VoidCallback onBack, onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border(top: BorderSide(color: AppColors.borderSoft)),
      ),
      child: Row(
        children: [
          if (step > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: onBack,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.fg2,
                  side: const BorderSide(color: AppColors.borderMedium),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Kembali'),
              ),
            ),
          if (step > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: FilledButton(
              onPressed: (canAdvance && !isSaving) ? onNext : null,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.borderMedium,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(step == 5 ? 'Simpan & Selesai' : 'Lanjut'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Step 1: Situasi ─────────────────────────────────────────────────────────

class _Step1Situation extends StatelessWidget {
  const _Step1Situation({required this.value, required this.onChanged});
  final String value;
  final void Function(String) onChanged;

  @override
  Widget build(BuildContext context) => _StepScaffold(
        stepLabel: 'Langkah 1 dari 6',
        question: 'Apa yang sedang terjadi ketika kamu merasa tidak nyaman?',
        hint:
            'Deskripsikan situasi secara spesifik — di mana, kapan, dengan siapa.',
        child: _LargeInput(
          initialValue: value,
          hintText:
              'Contoh: "Saya presentasi di depan tim dan semua orang memperhatikan saya..."',
          onChanged: onChanged,
          minLines: 5,
        ),
      );
}

// ─── Step 2: Emosi ────────────────────────────────────────────────────────────

class _Step2Emotions extends StatefulWidget {
  const _Step2Emotions({
    required this.selected,
    required this.onToggle,
    required this.onIntensity,
  });
  final List<EmotionEntry> selected;
  final void Function(EmotionEntry) onToggle;
  final void Function(String, int) onIntensity;

  @override
  State<_Step2Emotions> createState() => _Step2EmotionsState();
}

class _Step2EmotionsState extends State<_Step2Emotions> {
  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      stepLabel: 'Langkah 2 dari 6',
      question: 'Emosi apa yang kamu rasakan?',
      hint: 'Pilih semua yang relevan, lalu atur tingkat intensitasnya.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kAvailableEmotions.map((e) {
              final isSelected = widget.selected.any((s) => s.label == e.label);
              return _EmotionChip(
                emotion: e,
                isSelected: isSelected,
                onTap: () => widget.onToggle(e),
              );
            }).toList(),
          ),
          if (widget.selected.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Intensitas:',
                style: AppTextStyles.h4.copyWith(color: AppColors.fg1)),
            const SizedBox(height: 12),
            ...widget.selected.map((e) => _IntensityRow(
                  emotion: e,
                  onChanged: (v) => widget.onIntensity(e.label, v),
                )),
          ],
        ],
      ),
    );
  }
}

class _EmotionChip extends StatelessWidget {
  const _EmotionChip(
      {required this.emotion, required this.isSelected, required this.onTap});
  final EmotionEntry emotion;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.biru500 : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected ? AppColors.biru500 : AppColors.borderMedium,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emotion.emoji, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            Text(
              emotion.label,
              style: AppTextStyles.bodyM.copyWith(
                color: isSelected ? Colors.white : AppColors.fg2,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IntensityRow extends StatelessWidget {
  const _IntensityRow({required this.emotion, required this.onChanged});
  final EmotionEntry emotion;
  final void Function(int) onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('${emotion.emoji} ${emotion.label}',
                  style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1)),
              const Spacer(),
              Text('${emotion.intensity}%',
                  style: AppTextStyles.label.copyWith(
                      color: AppColors.biru500, fontWeight: FontWeight.w700)),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
              activeTrackColor: AppColors.biru500,
              inactiveTrackColor: AppColors.borderSoft,
              thumbColor: AppColors.biru500,
            ),
            child: Slider(
              value: emotion.intensity.toDouble(),
              min: 0,
              max: 100,
              divisions: 20,
              onChanged: (v) => onChanged(v.round()),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Step 3: Pikiran Otomatis ─────────────────────────────────────────────────

class _Step3AutomaticThought extends StatelessWidget {
  const _Step3AutomaticThought({required this.value, required this.onChanged});
  final String value;
  final void Function(String) onChanged;

  @override
  Widget build(BuildContext context) => _StepScaffold(
        stepLabel: 'Langkah 3 dari 6',
        question: 'Apa pikiran yang muncul di kepalamu?',
        hint: 'Tuliskan tepat seperti yang kamu pikirkan, apa adanya.',
        child: _LargeInput(
          initialValue: value,
          hintText:
              'Contoh: "Semua orang pasti melihat saya bodoh. Saya tidak akan pernah bisa..."',
          onChanged: onChanged,
          minLines: 5,
        ),
      );
}

// ─── Step 4: Bukti Mendukung ──────────────────────────────────────────────────

class _Step4Evidence extends StatelessWidget {
  const _Step4Evidence({
    required this.items,
    required this.ctrl,
    required this.onAdd,
    required this.onRemove,
  });
  final List<String> items;
  final TextEditingController ctrl;
  final void Function(String) onAdd;
  final void Function(int) onRemove;

  @override
  Widget build(BuildContext context) => _StepScaffold(
        stepLabel: 'Langkah 4 dari 6',
        question: 'Bukti apa yang mendukung pikiran tersebut?',
        hint:
            'Fakta nyata — bukan asumsi — yang membuat pikiran itu terasa benar.',
        child: _EvidenceInput(
          items: items,
          ctrl: ctrl,
          onAdd: onAdd,
          onRemove: onRemove,
          hintText: 'Tambah bukti...',
          accentColor: AppColors.danger500,
        ),
      );
}

// ─── Step 5: Bukti Menentang ──────────────────────────────────────────────────

class _Step5Counter extends StatelessWidget {
  const _Step5Counter({
    required this.items,
    required this.ctrl,
    required this.onAdd,
    required this.onRemove,
  });
  final List<String> items;
  final TextEditingController ctrl;
  final void Function(String) onAdd;
  final void Function(int) onRemove;

  @override
  Widget build(BuildContext context) => _StepScaffold(
        stepLabel: 'Langkah 5 dari 6',
        question: 'Bukti apa yang TIDAK mendukung pikiran tersebut?',
        hint:
            'Fakta atau pengalaman yang bertentangan dengan pikiran negatif itu.',
        child: _EvidenceInput(
          items: items,
          ctrl: ctrl,
          onAdd: onAdd,
          onRemove: onRemove,
          hintText: 'Tambah bukti penentang...',
          accentColor: AppColors.success500,
        ),
      );
}

// ─── Step 6: Pikiran Alternatif ───────────────────────────────────────────────

class _Step6Balanced extends StatefulWidget {
  const _Step6Balanced({
    required this.balancedThought,
    required this.beliefScore,
    required this.afterEmotions,
    required this.onThoughtChanged,
    required this.onBeliefChanged,
    required this.onToggleEmotion,
    required this.onIntensity,
  });
  final String balancedThought;
  final int beliefScore;
  final List<EmotionEntry> afterEmotions;
  final void Function(String) onThoughtChanged;
  final void Function(int) onBeliefChanged;
  final void Function(EmotionEntry) onToggleEmotion;
  final void Function(String, int) onIntensity;

  @override
  State<_Step6Balanced> createState() => _Step6BalancedState();
}

class _Step6BalancedState extends State<_Step6Balanced> {
  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      stepLabel: 'Langkah 6 dari 6',
      question: 'Berdasarkan semua bukti, apa pikiran yang lebih seimbang?',
      hint:
          'Bukan pikiran positif palsu — melainkan yang lebih realistis dan adil.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _LargeInput(
            initialValue: widget.balancedThought,
            hintText:
                'Contoh: "Presentasi saya mungkin tidak sempurna, namun saya sudah mempersiapkannya dengan baik..."',
            onChanged: widget.onThoughtChanged,
            minLines: 4,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Text('Seberapa kamu percaya pikiran baru ini?',
                  style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1)),
              const Spacer(),
              Text('${widget.beliefScore}%',
                  style: AppTextStyles.label.copyWith(
                      color: AppColors.sage500, fontWeight: FontWeight.w700)),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
              activeTrackColor: AppColors.sage500,
              inactiveTrackColor: AppColors.borderSoft,
              thumbColor: AppColors.sage500,
            ),
            child: Slider(
              value: widget.beliefScore.toDouble(),
              min: 0,
              max: 100,
              divisions: 20,
              onChanged: (v) => widget.onBeliefChanged(v.round()),
            ),
          ),
          const SizedBox(height: 16),
          Text('Emosi sekarang:',
              style: AppTextStyles.h4.copyWith(color: AppColors.fg1)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kAvailableEmotions.map((e) {
              final isSelected =
                  widget.afterEmotions.any((s) => s.label == e.label);
              return _EmotionChip(
                emotion: e,
                isSelected: isSelected,
                onTap: () => widget.onToggleEmotion(e),
              );
            }).toList(),
          ),
          if (widget.afterEmotions.isNotEmpty) ...[
            const SizedBox(height: 16),
            ...widget.afterEmotions.map((e) => _IntensityRow(
                  emotion: e,
                  onChanged: (v) => widget.onIntensity(e.label, v),
                )),
          ],
        ],
      ),
    );
  }
}

// ─── Completion screen ────────────────────────────────────────────────────────

class _CompletionScreen extends StatelessWidget {
  const _CompletionScreen({required this.draft, required this.onReset});
  final ThoughtRecordDraft draft;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.success500, size: 72),
              const SizedBox(height: 16),
              Text(
                'Hebat! Kamu telah menyelesaikan\nThought Record.',
                style: AppTextStyles.h2.copyWith(color: AppColors.fg1),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Menantang pikiran negatif adalah langkah berani. Lakukan ini setiap kali pikiran negatif muncul.',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              // Before vs After comparison
              if (draft.emotions.isNotEmpty && draft.afterEmotions.isNotEmpty)
                _ComparisonCard(
                    before: draft.emotions, after: draft.afterEmotions),
              if (draft.error != null) ...[
                const SizedBox(height: 16),
                _InlineErrorBanner(message: draft.error!),
              ],
              const Spacer(),
              FilledButton(
                onPressed: onReset,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.biru500,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Selesai'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ComparisonCard extends StatelessWidget {
  const _ComparisonCard({required this.before, required this.after});
  final List<EmotionEntry> before, after;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        children: [
          Expanded(
              child: _EmotionCol(
                  label: 'Sebelum',
                  emotions: before,
                  color: AppColors.danger500)),
          Container(width: 1, height: 80, color: AppColors.borderSoft),
          Expanded(
              child: _EmotionCol(
                  label: 'Sesudah',
                  emotions: after,
                  color: AppColors.success500)),
        ],
      ),
    );
  }
}

class _EmotionCol extends StatelessWidget {
  const _EmotionCol(
      {required this.label, required this.emotions, required this.color});
  final String label;
  final List<EmotionEntry> emotions;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final avgIntensity = emotions.isEmpty
        ? 0
        : emotions.map((e) => e.intensity).reduce((a, b) => a + b) ~/
            emotions.length;
    return Column(
      children: [
        Text(label, style: AppTextStyles.label.copyWith(color: AppColors.fg4)),
        const SizedBox(height: 6),
        Text('${emotions.map((e) => e.emoji).join(' ')}',
            style: const TextStyle(fontSize: 20)),
        const SizedBox(height: 4),
        Text('$avgIntensity%',
            style: AppTextStyles.h3
                .copyWith(color: color, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

// ─── Shared sub-widgets ───────────────────────────────────────────────────────

class _StepScaffold extends StatelessWidget {
  const _StepScaffold({
    required this.stepLabel,
    required this.question,
    required this.hint,
    required this.child,
  });
  final String stepLabel, question, hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(stepLabel,
              style: AppTextStyles.label.copyWith(color: AppColors.biru500)),
          const SizedBox(height: 8),
          Text(question,
              style: AppTextStyles.h3.copyWith(color: AppColors.fg1)),
          const SizedBox(height: 6),
          Text(hint, style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}

class _LargeInput extends StatefulWidget {
  const _LargeInput({
    required this.initialValue,
    required this.hintText,
    required this.onChanged,
    this.minLines = 4,
  });
  final String initialValue, hintText;
  final void Function(String) onChanged;
  final int minLines;

  @override
  State<_LargeInput> createState() => _LargeInputState();
}

class _LargeInputState extends State<_LargeInput> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      onChanged: widget.onChanged,
      minLines: widget.minLines,
      maxLines: null,
      style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
      decoration: InputDecoration(
        hintText: widget.hintText,
        hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
        filled: true,
        fillColor: AppColors.surfaceCard,
        contentPadding: const EdgeInsets.all(16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderSoft),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderSoft),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.biru500, width: 1.5),
        ),
      ),
    );
  }
}

class _EvidenceInput extends StatelessWidget {
  const _EvidenceInput({
    required this.items,
    required this.ctrl,
    required this.onAdd,
    required this.onRemove,
    required this.hintText,
    required this.accentColor,
  });
  final List<String> items;
  final TextEditingController ctrl;
  final void Function(String) onAdd;
  final void Function(int) onRemove;
  final String hintText;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: ctrl,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
                decoration: InputDecoration(
                  hintText: hintText,
                  hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                  filled: true,
                  fillColor: AppColors.surfaceCard,
                  contentPadding: const EdgeInsets.all(14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.borderSoft),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.borderSoft),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: accentColor, width: 1.5),
                  ),
                ),
                onSubmitted: onAdd,
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: () => onAdd(ctrl.text),
              style: FilledButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              child: const Icon(Icons.add, size: 20),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...items.asMap().entries.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: accentColor.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(e.value,
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.fg1)),
                    ),
                    GestureDetector(
                      onTap: () => onRemove(e.key),
                      child: Icon(Icons.close, size: 18, color: accentColor),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}
