import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/l10n/app_strings.dart';
import '../../../../core/providers/accessibility_provider.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mood_glyph.dart';
import '../providers/mood_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// MoodTrackerScreen — entry point, loads today's entry then hands off
// ─────────────────────────────────────────────────────────────────────────────

class MoodTrackerScreen extends ConsumerWidget {
  const MoodTrackerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todayAsync = ref.watch(todayMoodEntryProvider);

    return todayAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => _MoodErrorScaffold(message: errorMessage(e)),
      data: (existing) => _CheckinScaffold(existingId: existing?.id),
    );
  }
}

class _MoodErrorScaffold extends StatelessWidget {
  const _MoodErrorScaffold({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Text(
            message,
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkin scaffold — initialises the notifier once we know edit state
// ─────────────────────────────────────────────────────────────────────────────

class _CheckinScaffold extends ConsumerStatefulWidget {
  const _CheckinScaffold({this.existingId});

  final String? existingId;

  @override
  ConsumerState<_CheckinScaffold> createState() => _CheckinScaffoldState();
}

class _CheckinScaffoldState extends ConsumerState<_CheckinScaffold> {
  final _noteController = TextEditingController();
  bool _initialized = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _maybeInit() {
    if (_initialized) return;
    _initialized = true;
    final todayEntry = ref.read(todayMoodEntryProvider).valueOrNull;
    if (todayEntry != null) {
      _noteController.text = todayEntry.note;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref.read(moodCheckinProvider.notifier).initFromEntry(todayEntry);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    _maybeInit();

    final state = ref.watch(moodCheckinProvider);
    final notifier = ref.read(moodCheckinProvider.notifier);
    final userId = ref.read(supabaseProvider).auth.currentUser?.id ?? '';

    ref.listen<MoodCheckinState>(moodCheckinProvider, (prev, next) {
      if (next.saved && !(prev?.saved ?? false)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'Mood tercatat!',
                  style: AppTextStyles.bodyM
                      .copyWith(color: Colors.white, height: 1),
                ),
              ],
            ),
            backgroundColor: AppColors.sage500,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
          ),
        );
        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) context.pop();
        });
      }

      if (next.error != null && prev?.error != next.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.danger500,
          ),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: AppColors.fg1,
          onPressed: () => context.pop(),
        ),
        title: Text(
          state.isEditMode ? 'Edit Catatan Mood' : 'Lacak Perasaan',
          style: AppTextStyles.h3,
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () => context.push('/home/mood/history'),
            child: Text(
              'Riwayat',
              style: AppTextStyles.label.copyWith(color: AppColors.biru500),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSpacing.sm),

            // ── Header ──────────────────────────────────────────────
            Text(
              AppStrings.moodCheckinPrompt(
                ref.watch(accessibilityProvider).languageMode,
              ),
              style: AppTextStyles.displayM,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(DateTime.now()),
              style: AppTextStyles.bodyM,
            ),
            const SizedBox(height: AppSpacing.xxl),

            // ── Mood selector ────────────────────────────────────────
            _MoodEmojiSelector(
              selected: state.selectedMood,
              onSelect: notifier.selectMood,
            ),

            const SizedBox(height: AppSpacing.xxl),

            // ── Energy level ─────────────────────────────────────────
            Text('Tingkat Energi', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.sm),
            _EnergySelector(
              level: state.energyLevel,
              onSelect: notifier.setEnergy,
            ),

            const SizedBox(height: AppSpacing.xxl),

            // ── Triggers ─────────────────────────────────────────────
            Text('Apa yang mempengaruhi?', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Pilih semua yang relevan',
              style: AppTextStyles.bodyS,
            ),
            const SizedBox(height: AppSpacing.sm),
            _TriggerChips(
              selected: state.triggers,
              onToggle: notifier.toggleTrigger,
            ),

            const SizedBox(height: AppSpacing.xxl),

            // ── Note ─────────────────────────────────────────────────
            Text('Catatan (opsional)', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.sm),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.borderSoft),
              ),
              child: TextField(
                controller: _noteController,
                maxLines: 4,
                maxLength: 500,
                onChanged: notifier.setNote,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
                decoration: InputDecoration(
                  hintText: 'Ceritakan lebih lanjut tentang harimu…',
                  hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(AppSpacing.md),
                  counterStyle: AppTextStyles.meta,
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.xxl),

            MnButton(
              label: state.isEditMode ? 'Perbarui Catatan' : 'Simpan Mood',
              onPressed: state.selectedMood != null && !state.isSaving
                  ? () => notifier.save(userId)
                  : null,
              isLoading: state.isSaving,
            ),

            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood emoji selector — 7 glyphs in horizontal scroll
// ─────────────────────────────────────────────────────────────────────────────

class _MoodEmojiSelector extends StatelessWidget {
  const _MoodEmojiSelector({
    required this.selected,
    required this.onSelect,
  });

  final MoodType? selected;
  final ValueChanged<MoodType> onSelect;

  static const _ordered = [
    MoodType.bahagia,
    MoodType.syukur,
    MoodType.tenang,
    MoodType.hangat,
    MoodType.lelah,
    MoodType.cemas,
    MoodType.sedih,
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _ordered.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (_, i) => _MoodItem(
          mood: _ordered[i],
          isSelected: selected == _ordered[i],
          onTap: () => onSelect(_ordered[i]),
        ),
      ),
    );
  }
}

class _MoodItem extends StatelessWidget {
  const _MoodItem({
    required this.mood,
    required this.isSelected,
    required this.onTap,
  });

  final MoodType mood;
  final bool isSelected;
  final VoidCallback onTap;

  static Color _moodColor(MoodType m) => switch (m) {
        MoodType.bahagia => AppColors.moodBahagia,
        MoodType.syukur => AppColors.moodSyukur,
        MoodType.tenang => AppColors.moodTenang,
        MoodType.hangat => AppColors.moodHangat,
        MoodType.lelah => AppColors.moodLelah,
        MoodType.cemas => AppColors.moodCemas,
        MoodType.sedih => AppColors.moodSedih,
      };

  @override
  Widget build(BuildContext context) {
    final color = _moodColor(mood);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        decoration: BoxDecoration(
          color:
              isSelected ? color.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color:
                isSelected ? color.withValues(alpha: 0.5) : Colors.transparent,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            MoodGlyph(mood: mood, size: isSelected ? 44 : 36)
                .animate(
                    key: ValueKey(
                        isSelected ? '${mood.name}-on' : '${mood.name}-off'))
                .scale(
                  begin: isSelected
                      ? const Offset(0.6, 0.6)
                      : const Offset(1.0, 1.0),
                  end: const Offset(1.0, 1.0),
                  duration: 380.ms,
                  curve: Curves.elasticOut,
                ),
            const SizedBox(height: 4),
            Text(
              mood.label,
              style: AppTextStyles.meta.copyWith(
                color: isSelected ? color : AppColors.fg3,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy selector — 1-5 icon row
// ─────────────────────────────────────────────────────────────────────────────

class _EnergySelector extends StatelessWidget {
  const _EnergySelector({required this.level, required this.onSelect});

  final int level;
  final ValueChanged<int> onSelect;

  static const _labels = [
    'Sangat\nLelah',
    'Lelah',
    'Netral',
    'Segar',
    'Sangat\nSegar'
  ];
  static const _icons = [
    Icons.battery_0_bar_rounded,
    Icons.battery_2_bar_rounded,
    Icons.battery_4_bar_rounded,
    Icons.battery_5_bar_rounded,
    Icons.battery_full_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(5, (i) {
        final value = i + 1;
        final isSelected = level == value;
        return Expanded(
          child: GestureDetector(
            onTap: () => onSelect(value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.biru50 : AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: isSelected ? AppColors.biru400 : AppColors.borderSoft,
                  width: isSelected ? 1.5 : 1,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    _icons[i],
                    size: 22,
                    color:
                        isSelected ? AppColors.biru600 : AppColors.neutral400,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _labels[i],
                    style: AppTextStyles.meta.copyWith(
                      color: isSelected ? AppColors.biru700 : AppColors.fg4,
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger chips
// ─────────────────────────────────────────────────────────────────────────────

class _TriggerChips extends StatelessWidget {
  const _TriggerChips({required this.selected, required this.onToggle});

  final List<String> selected;
  final ValueChanged<String> onToggle;

  static const _triggers = [
    'Pekerjaan',
    'Keluarga',
    'Hubungan',
    'Kesehatan',
    'Keuangan',
    'Tidur',
    'Sosial',
    'Aktivitas Fisik',
    'Cuaca',
    'Lainnya',
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.xs,
      runSpacing: AppSpacing.xs,
      children: _triggers.map((t) {
        final isOn = selected.contains(t);
        return FilterChip(
          label: Text(
            t,
            style: AppTextStyles.label.copyWith(
              color: isOn ? AppColors.biru700 : AppColors.fg2,
            ),
          ),
          selected: isOn,
          onSelected: (_) => onToggle(t),
          backgroundColor: AppColors.surfaceRaised,
          selectedColor: AppColors.biru50,
          checkmarkColor: AppColors.biru600,
          side: BorderSide(
            color: isOn ? AppColors.biru400 : AppColors.borderSoft,
            width: isOn ? 1.5 : 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.pill),
          ),
          showCheckmark: true,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xs,
            vertical: 2,
          ),
        );
      }).toList(),
    );
  }
}
