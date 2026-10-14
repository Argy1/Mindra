import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/exercise_entity.dart';
import '../providers/exercise_provider.dart';

class CbtExerciseScreen extends ConsumerWidget {
  const CbtExerciseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final streaks = ref.watch(streakProvider);

    if (user != null && !streaks.isLoading && streaks.streaks.isEmpty) {
      ref.read(streakProvider.notifier).load(user.id);
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: AppColors.surfaceCanvas,
            surfaceTintColor: Colors.transparent,
            floating: true,
            title: Text('Latihan CBT', style: AppTextStyles.h3),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Divider(height: 1, color: AppColors.borderSoft),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Teknik berbasis bukti untuk kesehatan mental',
                    style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                  ),
                  const SizedBox(height: 6),
                  _EvidenceBadge(),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            sliver: SliverList.separated(
              itemCount: CbtExerciseType.values.length,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (_, i) {
                final type = CbtExerciseType.values[i];
                final streak = streaks.streakFor(type);
                return _ExerciseCard(
                  type: type,
                  streak: streak,
                  onTap: () => context.go('/home/cbt/${type.id}'),
                );
              },
            ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
        ],
      ),
    );
  }
}

class _EvidenceBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.verified_outlined, size: 14, color: AppColors.biru500),
          const SizedBox(width: 5),
          Text(
            'Divalidasi oleh psikolog klinis',
            style: AppTextStyles.label.copyWith(color: AppColors.biru700, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({
    required this.type,
    required this.streak,
    required this.onTap,
  });

  final CbtExerciseType type;
  final int streak;
  final VoidCallback onTap;

  Color get _accent => switch (type) {
        CbtExerciseType.thoughtRecord => AppColors.biru500,
        CbtExerciseType.behavioralActivation => AppColors.matahari500,
        CbtExerciseType.pmr => AppColors.sage500,
        CbtExerciseType.guidedBreathing => const Color(0xFF7B68EE),
      };

  Color get _accentLight => switch (type) {
        CbtExerciseType.thoughtRecord => AppColors.biru50,
        CbtExerciseType.behavioralActivation => AppColors.matahari50,
        CbtExerciseType.pmr => AppColors.sage50,
        CbtExerciseType.guidedBreathing => const Color(0xFFF0EEFF),
      };

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon container
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _accentLight,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(type.emoji, style: const TextStyle(fontSize: 28)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            type.title,
                            style: AppTextStyles.h4.copyWith(color: AppColors.fg1),
                          ),
                        ),
                        if (streak > 0)
                          Container(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.matahari50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.matahari200),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('🔥', style: TextStyle(fontSize: 12)),
                                const SizedBox(width: 3),
                                Text(
                                  '$streak hari',
                                  style: AppTextStyles.label.copyWith(
                                    color: AppColors.matahari700,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      type.subtitle,
                      style: AppTextStyles.bodyM.copyWith(color: AppColors.fg2),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _Chip(
                          icon: Icons.timer_outlined,
                          label: type.durationLabel,
                          color: _accent,
                        ),
                        const SizedBox(width: 8),
                        _Chip(
                          icon: Icons.info_outline,
                          label: type.forLabel,
                          color: AppColors.fg4,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.fg4),
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 3),
        Text(
          label,
          style: AppTextStyles.label.copyWith(color: color, fontSize: 11),
        ),
      ],
    );
  }
}
