import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';

enum MnButtonVariant { primary, secondary, ghost, danger }
enum MnButtonSize { lg, md, sm }

class MnButton extends StatelessWidget {
  const MnButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = MnButtonVariant.primary,
    this.size = MnButtonSize.lg,
    this.isLoading = false,
    this.isFullWidth = true,
    this.leadingIcon,
    this.trailingIcon,
  });

  final String label;
  final VoidCallback? onPressed;
  final MnButtonVariant variant;
  final MnButtonSize size;
  final bool isLoading;
  final bool isFullWidth;
  final Widget? leadingIcon;
  final Widget? trailingIcon;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;

    final height = switch (size) {
      MnButtonSize.lg => 52.0,
      MnButtonSize.md => 48.0,
      MnButtonSize.sm => 40.0,
    };

    final fontSize = switch (size) {
      MnButtonSize.lg => 16.0,
      MnButtonSize.md => 15.0,
      MnButtonSize.sm => 14.0,
    };

    final hPad = switch (size) {
      MnButtonSize.lg => AppSpacing.xl,
      MnButtonSize.md => AppSpacing.lg,
      MnButtonSize.sm => AppSpacing.md,
    };

    Widget child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _loaderColor,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leadingIcon != null) ...[leadingIcon!, const SizedBox(width: 8)],
              Text(label),
              if (trailingIcon != null) ...[const SizedBox(width: 8), trailingIcon!],
            ],
          );

    final button = _buildButton(child, height, hPad, fontSize, disabled);

    return SizedBox(
      width: isFullWidth ? double.infinity : null,
      height: height,
      child: button,
    );
  }

  Color get _loaderColor => switch (variant) {
        MnButtonVariant.primary || MnButtonVariant.danger => AppColors.fgOnPrimary,
        MnButtonVariant.secondary || MnButtonVariant.ghost => AppColors.biru500,
      };

  Widget _buildButton(
    Widget child,
    double height,
    double hPad,
    double fontSize,
    bool disabled,
  ) {
    final textStyle = AppTextStyles.buttonL.copyWith(fontSize: fontSize);

    switch (variant) {
      case MnButtonVariant.primary:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.biru500,
            foregroundColor: AppColors.fgOnPrimary,
            disabledBackgroundColor: AppColors.biru500.withValues(alpha: 0.4),
            disabledForegroundColor: AppColors.fgOnPrimary,
            minimumSize: Size(0, height),
            padding: EdgeInsets.symmetric(horizontal: hPad),
            shape: const StadiumBorder(),
            elevation: 0,
            textStyle: textStyle,
          ),
          child: child,
        );

      case MnButtonVariant.secondary:
        return OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.biru500,
            disabledForegroundColor: AppColors.biru500.withValues(alpha: 0.4),
            minimumSize: Size(0, height),
            padding: EdgeInsets.symmetric(horizontal: hPad),
            shape: const StadiumBorder(),
            side: BorderSide(
              color: disabled
                  ? AppColors.biru500.withValues(alpha: 0.4)
                  : AppColors.biru500,
              width: 1.5,
            ),
            textStyle: textStyle.copyWith(color: AppColors.biru500),
          ),
          child: child,
        );

      case MnButtonVariant.ghost:
        return TextButton(
          onPressed: isLoading ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.biru500,
            disabledForegroundColor: AppColors.biru500.withValues(alpha: 0.4),
            minimumSize: Size(0, height),
            padding: EdgeInsets.symmetric(horizontal: hPad),
            shape: const StadiumBorder(),
            textStyle: textStyle.copyWith(color: AppColors.biru500),
          ),
          child: child,
        );

      case MnButtonVariant.danger:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.danger100,
            foregroundColor: AppColors.danger700,
            disabledBackgroundColor: AppColors.danger100.withValues(alpha: 0.4),
            minimumSize: Size(0, height),
            padding: EdgeInsets.symmetric(horizontal: hPad),
            shape: const StadiumBorder(),
            elevation: 0,
            textStyle: textStyle.copyWith(color: AppColors.danger700),
          ),
          child: child,
        );
    }
  }
}
