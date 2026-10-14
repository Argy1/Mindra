import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_theme.dart';

/// Base card with white surface, warm shadow, radius-lg.
class MnCard extends StatelessWidget {
  const MnCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.radius,
    this.shadows,
    this.gradient,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final double? radius;
  final List<BoxShadow>? shadows;
  final Gradient? gradient;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final r = radius ?? AppRadius.card;
    final content = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? AppColors.surfaceRaised) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(r),
        boxShadow: shadows ?? AppTheme.shadowSm,
      ),
      child: child,
    );

    if (onTap == null) return content;

    return GestureDetector(
      onTap: onTap,
      child: content,
    );
  }
}

/// Hero card with biru-50 → sage-50 gradient background.
class MnHeroCard extends StatelessWidget {
  const MnHeroCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MnCard(
      padding: padding,
      gradient: const LinearGradient(
        begin: Alignment(-0.8, -0.6),
        end: Alignment(0.6, 0.6),
        colors: [AppColors.biru50, AppColors.sage50],
      ),
      shadows: [],
      onTap: onTap,
      child: child,
    );
  }
}

/// Mood card — compact, with a leading color indicator bar.
class MnMoodCard extends StatelessWidget {
  const MnMoodCard({
    super.key,
    required this.name,
    required this.time,
    required this.indicatorColor,
    required this.glyph,
    this.onTap,
  });

  final String name;
  final String time;
  final Color indicatorColor;
  final Widget glyph;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MnCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      radius: AppRadius.md,
      shadows: AppTheme.shadowXs,
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 6,
            height: 36,
            decoration: BoxDecoration(
              color: indicatorColor,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          glyph,
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.fg1,
                  fontWeight: FontWeight.w700,
                )),
                const SizedBox(height: 2),
                Text(time, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Assessment card with progress bar.
class MnAssessmentCard extends StatelessWidget {
  const MnAssessmentCard({
    super.key,
    required this.title,
    required this.duration,
    required this.progress,
    required this.isDone,
    required this.icon,
    this.onTap,
  });

  final String title;
  final String duration;
  final double progress; // 0.0 – 1.0
  final bool isDone;
  final Widget icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MnCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDone ? AppColors.success50 : AppColors.biru50,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: IconTheme(
                  data: IconThemeData(
                    color: isDone ? AppColors.success700 : AppColors.biru700,
                    size: 22,
                  ),
                  child: icon,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        )),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(duration,
                            style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(width: 6),
                        Container(
                          width: 3, height: 3,
                          decoration: const BoxDecoration(
                            color: AppColors.neutral300,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isDone ? 'Selesai' : 'Belum dimulai',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.neutral100,
              valueColor: AlwaysStoppedAnimation(
                isDone ? AppColors.success500 : AppColors.biru500,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isDone ? 'Hasil tersedia' : 'Kemajuan',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppColors.fg3,
                ),
              ),
              Text(
                '${(progress * 100).round()}%',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.fg1,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
