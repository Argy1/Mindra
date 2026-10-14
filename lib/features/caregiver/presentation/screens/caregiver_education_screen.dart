import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/models/caregiver_model.dart';
import '../../domain/entities/caregiver_entity.dart';

class CaregiverEducationScreen extends ConsumerWidget {
  const CaregiverEducationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = CaregiverTipModel.seeds;

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Panduan Mendampingi', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Intro
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4A9E8F), Color(0xFF2E6DA4)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('📚', style: TextStyle(fontSize: 36)),
                const SizedBox(height: 10),
                Text('Mendampingi dengan bijak',
                    style: AppTextStyles.h4.copyWith(color: Colors.white)),
                const SizedBox(height: 6),
                Text(
                  'Artikel-artikel ini disusun berdasarkan panduan psikologi klinis dan penelitian terkini tentang dukungan sosial dalam kesehatan mental.',
                  style:
                      AppTextStyles.bodyM.copyWith(color: Colors.white70, height: 1.5),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Category filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _CategoryChip(label: 'Semua', selected: true, onTap: () {}),
                _CategoryChip(label: 'Komunikasi', selected: false, onTap: () {}),
                _CategoryChip(label: 'Krisis', selected: false, onTap: () {}),
                _CategoryChip(label: 'Self-care', selected: false, onTap: () {}),
              ],
            ),
          ),

          const SizedBox(height: 16),

          ...articles.map((a) => _ArticleCard(article: a)),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? AppColors.sage500 : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? AppColors.sage500 : AppColors.borderMedium),
        ),
        child: Text(
          label,
          style: AppTextStyles.label.copyWith(
            color: selected ? Colors.white : AppColors.fg3,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article});
  final CaregiverTip article;

  Color get _categoryColor => switch (article.category) {
        'supporting' => AppColors.biru500,
        'communication' => AppColors.sage500,
        'crisis' => AppColors.danger500,
        'self_care' => AppColors.matahari500,
        _ => AppColors.fg3,
      };

  String get _categoryLabel => switch (article.category) {
        'supporting' => 'Mendampingi',
        'communication' => 'Komunikasi',
        'crisis' => 'Krisis',
        'self_care' => 'Merawat Diri',
        _ => article.category,
      };

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _openArticle(context),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSoft),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _categoryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _categoryLabel,
                    style: AppTextStyles.label.copyWith(
                        color: _categoryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
                const Spacer(),
                Text(
                  '${article.readMinutes} menit baca',
                  style: AppTextStyles.label
                      .copyWith(color: AppColors.fg4, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(article.title,
                style: AppTextStyles.bodyM.copyWith(
                    color: AppColors.fg1, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              article.content.split('\n').first,
              style:
                  AppTextStyles.bodyM.copyWith(color: AppColors.fg3, height: 1.5),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text('Baca selengkapnya',
                    style: AppTextStyles.label
                        .copyWith(color: _categoryColor, fontSize: 13)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward, size: 14, color: _categoryColor),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _openArticle(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ArticleSheet(article: article),
    );
  }
}

class _ArticleSheet extends StatelessWidget {
  const _ArticleSheet({required this.article});
  final CaregiverTip article;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceCanvas,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderMedium,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                controller: ctrl,
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
                children: [
                  Text(article.title,
                      style: AppTextStyles.h3.copyWith(color: AppColors.fg1)),
                  const SizedBox(height: 6),
                  Text('${article.readMinutes} menit baca',
                      style: AppTextStyles.label
                          .copyWith(color: AppColors.fg4, fontSize: 12)),
                  const Divider(height: 24),
                  Text(
                    article.content,
                    style:
                        AppTextStyles.bodyM.copyWith(color: AppColors.fg2, height: 1.8),
                  ),
                  const SizedBox(height: 32),
                  // Call to action
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.sage50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.sage500.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.favorite_outline,
                            color: AppColors.sage500, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Kehadiranmu sudah sangat berarti. Terus belajar adalah bentuk cinta yang nyata.',
                            style: AppTextStyles.bodyM
                                .copyWith(color: AppColors.sage700, height: 1.5),
                          ),
                        ),
                      ],
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
