import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

enum MnBadgeKind { sehat, perhatian, segera }

class MnBadge extends StatelessWidget {
  const MnBadge({super.key, required this.kind, required this.label});

  final MnBadgeKind kind;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (kind) {
      MnBadgeKind.sehat     => (AppColors.success50,  AppColors.success700),
      MnBadgeKind.perhatian => (AppColors.warning50,  AppColors.warning700),
      MnBadgeKind.segera    => (AppColors.danger50,   AppColors.danger700),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: AppTextStyles.overline.copyWith(
              color: fg,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// Mood chip with swatch dot.
class MnMoodChip extends StatelessWidget {
  const MnMoodChip({
    super.key,
    required this.label,
    required this.color,
    this.isActive = false,
    this.onTap,
  });

  final String label;
  final Color color;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.biru500 : AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? Colors.transparent : AppColors.borderSoft,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTextStyles.label.copyWith(
                color: isActive ? AppColors.fgOnPrimary : AppColors.fg2,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Category filter chip.
class MnChip extends StatelessWidget {
  const MnChip({
    super.key,
    required this.label,
    this.isActive = false,
    this.onTap,
  });

  final String label;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.biru500 : AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? Colors.transparent : AppColors.borderSoft,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.label.copyWith(
            color: isActive ? AppColors.fgOnPrimary : AppColors.fg2,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
