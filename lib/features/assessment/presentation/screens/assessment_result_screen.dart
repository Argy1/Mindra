import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_scaffold.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class AssessmentResultScreen extends StatelessWidget {
  const AssessmentResultScreen({super.key, required this.type});
  final String type;

  @override
  Widget build(BuildContext context) {
    return MnScaffold(
      title: 'Hasil Asesmen',
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        onPressed: () => context.pop(),
      ),
      showSos: false,
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.biru100,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.assignment_turned_in_outlined,
                  color: AppColors.biru600, size: 40),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text('Asesmen Selesai', style: AppTextStyles.h2),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Terima kasih sudah mengisi asesmen ${type.toUpperCase()}. Hasilmu telah tersimpan.',
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xxl),
            MnButton(
              label: 'Kembali ke Beranda',
              onPressed: () => context.go(AppRoutes.home),
            ),
            const SizedBox(height: AppSpacing.sm),
            MnButton(
              label: 'Lihat Semua Asesmen',
              variant: MnButtonVariant.ghost,
              onPressed: () => context.go(AppRoutes.assessment),
            ),
          ],
        ),
      ),
    );
  }
}
