import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Full-screen crisis support modal. Shown when Indonesian crisis language
/// is detected in a user's message.
///
/// Returns one of:
/// - `'crisis'` — user tapped the crisis-resources / hotline action
/// - `'ground'` — user tapped the grounding exercise action
/// - `'continue'` — user dismissed and wants to keep chatting
/// - `null` — dialog was closed externally
Future<String?> showCrisisOverlay(BuildContext context) {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    builder: (_) => const _CrisisOverlay(),
  );
}

class _CrisisOverlay extends StatelessWidget {
  const _CrisisOverlay();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.all(AppSpacing.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Heart icon
            Center(
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  color: Color(0xFFB91C1C),
                  size: 32,
                ),
              ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.08, 1.08),
                    duration: 1100.ms,
                    curve: Curves.easeInOut,
                  ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Title
            Text(
              'Aku dengar kamu sedang sangat kesakitan 💙',
              style: AppTextStyles.h2.copyWith(height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Kamu tidak harus melewati ini sendirian. Ada orang-orang yang siap mendengarkan dan membantu, sekarang juga.',
              style: AppTextStyles.bodyM
                  .copyWith(height: 1.55, color: AppColors.fg2),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Primary action — hotline
            _ActionTile(
              color: const Color(0xFFB91C1C),
              background: const Color(0xFFFEF2F2),
              icon: Icons.call_rounded,
              title: 'Hubungi 119 ext. 8',
              subtitle: 'Healing119.id (Kemenkes) — pagi hingga malam hari, gratis',
              onTap: () => Navigator.of(context).pop('crisis'),
            ),
            const SizedBox(height: AppSpacing.xs),

            // Grounding
            _ActionTile(
              color: AppColors.sage700,
              background: AppColors.sage50,
              icon: Icons.spa_rounded,
              title: 'Latihan grounding 5-4-3-2-1',
              subtitle: 'Bantu menenangkan pikiran sekarang',
              onTap: () {
                Navigator.of(context).pop('ground');
                context.push('/home/crisis/grounding');
              },
            ),
            const SizedBox(height: AppSpacing.xs),

            // Continue chatting
            _ActionTile(
              color: AppColors.biru600,
              background: AppColors.biru50,
              icon: Icons.chat_bubble_outline_rounded,
              title: 'Lanjut ngobrol dengan Mindra',
              subtitle: 'Aku di sini untuk mendengarkan',
              onTap: () => Navigator.of(context).pop('continue'),
            ),

            const SizedBox(height: AppSpacing.md),
            Text(
              'Jika kamu atau seseorang dalam bahaya segera, hubungi 112 atau pergi ke IGD terdekat.',
              style: AppTextStyles.meta.copyWith(
                color: AppColors.fg4,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.color,
    required this.background,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final Color color;
  final Color background;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyM.copyWith(
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.bodyS,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: color),
          ],
        ),
      ),
    );
  }
}
