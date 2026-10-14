import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

/// Dismissible banner shown once per day above the chat list.
class DisclaimerBanner extends StatelessWidget {
  const DisclaimerBanner({
    super.key,
    required this.onDismiss,
  });

  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.sm,
        AppSpacing.screenPadding,
        AppSpacing.xs,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline_rounded,
            size: 18,
            color: AppColors.biru600,
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  'Mindra AI bukan pengganti psikolog. ',
                  style: AppTextStyles.bodyS.copyWith(
                    color: AppColors.biru800,
                    height: 1.5,
                  ),
                ),
                GestureDetector(
                  onTap: () => context.push('/home/telemedicine'),
                  child: Text(
                    'Butuh bantuan profesional? Konsultasi →',
                    style: AppTextStyles.bodyS.copyWith(
                      color: AppColors.biru600,
                      fontWeight: FontWeight.w700,
                      decoration: TextDecoration.underline,
                      decorationColor: AppColors.biru600,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          GestureDetector(
            onTap: onDismiss,
            behavior: HitTestBehavior.opaque,
            child: const Padding(
              padding: EdgeInsets.all(2),
              child: Icon(
                Icons.close_rounded,
                size: 16,
                color: AppColors.biru600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
