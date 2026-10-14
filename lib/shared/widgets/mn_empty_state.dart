import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import 'mn_button.dart';

/// Empty-state placeholder for lists and pages with no data.
///
/// Shows an icon, title, optional description, and an optional CTA button.
class MnEmptyState extends StatelessWidget {
  const MnEmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon = Icons.inbox_outlined,
    this.iconColor,
    this.iconSize = 64,
    this.ctaLabel,
    this.onCta,
    this.compact = false,
  });

  final String title;
  final String? description;
  final IconData icon;
  final Color? iconColor;
  final double iconSize;

  /// Label for the call-to-action button. Shown only when [onCta] is set.
  final String? ctaLabel;
  final VoidCallback? onCta;

  /// Compact reduces vertical padding — useful inside cards or panels.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final vPad = compact ? AppSpacing.xl : AppSpacing.xxxl;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: vPad,
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: iconSize + 24,
              height: iconSize + 24,
              decoration: BoxDecoration(
                color: (iconColor ?? AppColors.biru400).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: iconSize * 0.65,
                color: iconColor ?? AppColors.biru400,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTextStyles.h4,
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                description!,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                textAlign: TextAlign.center,
              ),
            ],
            if (onCta != null && ctaLabel != null) ...[
              const SizedBox(height: AppSpacing.xl),
              MnButton(
                label: ctaLabel!,
                onPressed: onCta,
                isFullWidth: false,
                size: MnButtonSize.md,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
