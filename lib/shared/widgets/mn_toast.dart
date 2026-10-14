import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_theme.dart';

enum MnToastKind { success, warning, error, info }

class MnToast extends StatelessWidget {
  const MnToast({
    super.key,
    required this.kind,
    required this.title,
    this.message,
    this.onDismiss,
  });

  final MnToastKind kind;
  final String title;
  final String? message;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final (borderColor, iconBg, iconColor, icon) = switch (kind) {
      MnToastKind.success => (
          AppColors.success500,
          AppColors.success50,
          AppColors.success700,
          Icons.check_rounded,
        ),
      MnToastKind.warning => (
          AppColors.warning500,
          AppColors.warning50,
          AppColors.warning700,
          Icons.warning_amber_rounded,
        ),
      MnToastKind.error => (
          AppColors.danger500,
          AppColors.danger50,
          AppColors.danger700,
          Icons.error_outline_rounded,
        ),
      MnToastKind.info => (
          AppColors.info500,
          AppColors.info50,
          AppColors.info700,
          Icons.info_outline_rounded,
        ),
    };

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppTheme.shadowLg,
        border: Border(left: BorderSide(color: borderColor, width: 4)),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title,
                    style: AppTextStyles.bodyL.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.fg1,
                      height: 1.3,
                    )),
                if (message != null) ...[
                  const SizedBox(height: 2),
                  Text(message!, style: AppTextStyles.bodyM),
                ],
              ],
            ),
          ),
          if (onDismiss != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(
                Icons.close_rounded,
                size: 16,
                color: AppColors.neutral400,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Show a toast overlay using ScaffoldMessenger.
  static void show(
    BuildContext context, {
    required MnToastKind kind,
    required String title,
    String? message,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: MnToast(kind: kind, title: title, message: message),
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
