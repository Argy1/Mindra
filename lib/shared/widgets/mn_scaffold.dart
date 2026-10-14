import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import 'mn_bottom_nav.dart';

/// App-wide scaffold with consistent appbar styling and SOS floating button.
///
/// The SOS button is always visible when [showSos] is true. Tap it to open
/// the emergency contacts bottom sheet, or supply [onSos] to override.
class MnScaffold extends StatelessWidget {
  const MnScaffold({
    super.key,
    required this.body,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.showAppBar = true,
    this.showSos = true,
    this.showBottomNav = false,
    this.currentNavIndex = 0,
    this.onNavTap,
    this.onSos,
    this.backgroundColor,
    this.resizeToAvoidBottomInset = true,
    this.centerTitle = false,
  });

  final Widget body;
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool showAppBar;
  final bool showSos;
  final bool showBottomNav;
  final int currentNavIndex;
  final ValueChanged<int>? onNavTap;

  /// Override the default emergency contacts sheet.
  final VoidCallback? onSos;
  final Color? backgroundColor;
  final bool resizeToAvoidBottomInset;
  final bool centerTitle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor ?? AppColors.surfaceCanvas,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      appBar: showAppBar
          ? AppBar(
              backgroundColor: backgroundColor ?? AppColors.surfaceCanvas,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              centerTitle: centerTitle,
              leading: leading,
              title: titleWidget ??
                  (title != null
                      ? Text(title!, style: AppTextStyles.h3)
                      : null),
              actions: actions,
            )
          : null,
      body: body,
      floatingActionButton: floatingActionButton ??
          (showSos ? _SosFab(onSos: onSos) : null),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: showBottomNav
          ? (bottomNavigationBar ??
              MnBottomNav(
                items: MnBottomNav.defaultItems,
                currentIndex: currentNavIndex,
                onTap: onNavTap ?? (_) {},
              ))
          : bottomNavigationBar,
    );
  }
}

class _SosFab extends StatelessWidget {
  const _SosFab({this.onSos});
  final VoidCallback? onSos;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.small(
      heroTag: 'mn_sos_fab',
      backgroundColor: AppColors.danger500,
      foregroundColor: AppColors.fgOnPrimary,
      elevation: 4,
      onPressed: onSos ?? () => context.push('/home/crisis'),
      tooltip: 'Bantuan Darurat',
      child: const Text(
        'SOS',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: AppColors.fgOnPrimary,
        ),
      ),
    );
  }
}

