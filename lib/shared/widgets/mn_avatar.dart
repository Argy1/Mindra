import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

enum MnAvatarSize { s, m, l, xl }

class MnAvatar extends StatelessWidget {
  const MnAvatar({
    super.key,
    this.name,
    this.imageUrl,
    this.size = MnAvatarSize.m,
    this.isOnline = false,
  });

  final String? name;
  final String? imageUrl;
  final MnAvatarSize size;
  final bool isOnline;

  double get _dimension => switch (size) {
        MnAvatarSize.s  => 32,
        MnAvatarSize.m  => 40,
        MnAvatarSize.l  => 56,
        MnAvatarSize.xl => 80,
      };

  double get _fontSize => switch (size) {
        MnAvatarSize.s  => 12,
        MnAvatarSize.m  => 14,
        MnAvatarSize.l  => 18,
        MnAvatarSize.xl => 26,
      };

  double get _onlineDotSize => _dimension * 0.28;

  String get _initials {
    if (name == null || name!.isEmpty) return '·';
    final parts = name!.trim().split(RegExp(r'\s+'));
    return parts
        .take(2)
        .map((p) => p.isNotEmpty ? p[0].toUpperCase() : '')
        .join();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _dimension,
      height: _dimension,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: _dimension,
            height: _dimension,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.biru400, AppColors.sage500],
              ),
              image: imageUrl != null
                  ? DecorationImage(
                      image: NetworkImage(imageUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: imageUrl == null
                ? Center(
                    child: Text(
                      _initials,
                      style: AppTextStyles.buttonL.copyWith(
                        fontSize: _fontSize,
                        color: AppColors.fgOnPrimary,
                      ),
                    ),
                  )
                : null,
          ),
          if (isOnline)
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: _onlineDotSize,
                height: _onlineDotSize,
                decoration: BoxDecoration(
                  color: AppColors.success500,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
