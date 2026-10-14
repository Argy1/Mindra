import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';

class MnNavItem {
  const MnNavItem({
    required this.icon,
    required this.label,
    this.badge = false,
  });

  final IconData icon;
  final String label;
  final bool badge;
}

/// Bottom navigation bar — 5 tabs, pill-style active state.
class MnBottomNav extends StatelessWidget {
  const MnBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  final List<MnNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _navItems = [
    MnNavItem(icon: Icons.home_rounded, label: 'Beranda'),
    MnNavItem(icon: Icons.assignment_outlined, label: 'Asesmen'),
    MnNavItem(icon: Icons.chat_bubble_outline, label: 'Chat', badge: false),
    MnNavItem(icon: Icons.videocam_outlined, label: 'Konsultasi'),
    MnNavItem(icon: Icons.person_outline_rounded, label: 'Profil'),
  ];

  static List<MnNavItem> get defaultItems => _navItems;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceRaised,
        border: Border(top: BorderSide(color: AppColors.neutral100)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: AppSpacing.bottomNavHeight,
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final isActive = i == currentIndex;
              return Expanded(
                child: _NavTab(
                  item: item,
                  isActive: isActive,
                  onTap: () => onTap(i),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({
    required this.item,
    required this.isActive,
    required this.onTap,
  });

  final MnNavItem item;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Icon(
                item.icon,
                size: 24,
                color: isActive ? AppColors.biru500 : AppColors.neutral400,
              ),
              if (item.badge)
                Positioned(
                  top: -2,
                  right: -4,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.danger500,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                item.label,
                maxLines: 1,
                style: AppTextStyles.label.copyWith(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: isActive ? AppColors.biru500 : AppColors.neutral400,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
