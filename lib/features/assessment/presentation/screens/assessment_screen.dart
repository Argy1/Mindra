import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_card.dart';
import '../../data/assessment_model.dart';
import '../providers/assessment_provider.dart';

class AssessmentScreen extends ConsumerWidget {
  const AssessmentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync = ref.watch(assessmentListProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            floating: true,
            backgroundColor: AppColors.surfaceCanvas,
            elevation: 0,
            expandedHeight: 100,
            actions: [
              IconButton(
                icon: const Icon(Icons.history_rounded),
                tooltip: 'Riwayat',
                onPressed: () => context.push(AppRoutes.assessmentHistory),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                'Asesmen',
                style: AppTextStyles.h2,
              ),
              titlePadding: const EdgeInsets.only(
                left: AppSpacing.screenPadding,
                bottom: 14,
              ),
              centerTitle: false,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenPadding,
            ),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Intro card
                MnCard(
                  color: AppColors.biru800,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DIPERCAYA TENAGA KESEHATAN',
                        style: AppTextStyles.overline.copyWith(
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Asesmen terstandarisasi untuk memahami kondisimu lebih dalam.',
                        style: AppTextStyles.h3.copyWith(
                          color: AppColors.fgOnDark,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Hasilnya bukan diagnosis — tapi bisa jadi panduan untuk percakapan dengan profesional.',
                        style: AppTextStyles.bodyS.copyWith(
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text('Pilih asesmen', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.sm),
                listAsync.when(
                  loading: () => const _LoadingList(),
                  error: (_, __) => const _ErrorState(),
                  data: (list) => _AssessmentList(items: list),
                ),
                SizedBox(
                  height: MediaQuery.of(context).padding.bottom + AppSpacing.xl,
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssessmentList extends StatelessWidget {
  const _AssessmentList({required this.items});

  final List<Assessment> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: items
          .map(
            (a) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: MnAssessmentCard(
                title: a.title,
                duration: a.duration,
                progress: a.progress,
                isDone: a.isDone,
                icon: const Icon(Icons.assignment_outlined),
                onTap: () => context.go('${AppRoutes.assessment}/${a.id}'),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (i) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Container(
            height: 110,
            decoration: BoxDecoration(
              color: AppColors.neutral100,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Text(
          'Tidak dapat memuat asesmen.\nCoba lagi nanti.',
          style: AppTextStyles.bodyM,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
