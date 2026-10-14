import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../providers/telemedicine_provider.dart';

class PsychologistDetailScreen extends ConsumerWidget {
  const PsychologistDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final psy = ref.watch(psychologistDetailProvider(id));

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: psy.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline,
                  color: AppColors.danger500, size: 40),
              const SizedBox(height: AppSpacing.sm),
              Text('Gagal memuat profil', style: AppTextStyles.bodyM),
              const SizedBox(height: AppSpacing.xs),
              TextButton(
                onPressed: () => ref.invalidate(psychologistDetailProvider(id)),
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
        data: (p) => _DetailBody(psychologist: p),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.psychologist});
  final Psychologist psychologist;

  String _formatPrice(int price) {
    if (price == 0) return 'Gratis';
    final f = price.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+$)'),
          (m) => '${m[1]}.',
        );
    return 'Rp $f / sesi';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            // Photo header
            SliverAppBar(
              expandedHeight: 240,
              pinned: true,
              backgroundColor: AppColors.biru700,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded,
                    color: Colors.white, size: 20),
                onPressed: () => context.pop(),
              ),
              flexibleSpace: FlexibleSpaceBar(
                background: psychologist.photoUrl.isNotEmpty
                    ? Image.network(
                        psychologist.photoUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            _PhotoFallback(name: psychologist.name),
                      )
                    : _PhotoFallback(name: psychologist.name),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name + badges
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(psychologist.name, style: AppTextStyles.h1),
                              const SizedBox(height: 4),
                              Text(psychologist.title,
                                  style: AppTextStyles.bodyM
                                      .copyWith(color: AppColors.fg3)),
                            ],
                          ),
                        ),
                        if (psychologist.isHimpsiVerified)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: AppSpacing.xs),
                            decoration: BoxDecoration(
                              color: AppColors.biru50,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              border: Border.all(color: AppColors.biru200),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.verified_rounded,
                                    size: 14, color: AppColors.biru500),
                                const SizedBox(width: 4),
                                Text(
                                  'HIMPSI',
                                  style: AppTextStyles.bodyS.copyWith(
                                    color: AppColors.biru600,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Stats row
                    Row(
                      children: [
                        _StatBadge(
                          icon: Icons.star_rounded,
                          iconColor: AppColors.matahari400,
                          label:
                              '${psychologist.rating.toStringAsFixed(1)} (${psychologist.reviewCount} ulasan)',
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Price
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.biru50,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.biru100),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.payments_outlined,
                              color: AppColors.biru500, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Text(
                            _formatPrice(psychologist.pricePerSession),
                            style: AppTextStyles.bodyM.copyWith(
                              color: AppColors.biru700,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Spacer(),
                          if (psychologist.isAvailableNow)
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.success500,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Tersedia hari ini',
                                  style: AppTextStyles.bodyS.copyWith(
                                    color: AppColors.success500,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Specializations
                    Text('Spesialisasi', style: AppTextStyles.h3),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: psychologist.specializations
                          .map(
                            (s) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.sm,
                                  vertical: AppSpacing.xs),
                              decoration: BoxDecoration(
                                color: AppColors.sage50,
                                borderRadius:
                                    BorderRadius.circular(AppRadius.pill),
                                border: Border.all(color: AppColors.sage200),
                              ),
                              child: Text(
                                s,
                                style: AppTextStyles.bodyS
                                    .copyWith(color: AppColors.sage700),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Bio
                    Text('Tentang', style: AppTextStyles.h3),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      psychologist.bio.isNotEmpty
                          ? psychologist.bio
                          : 'Tidak ada deskripsi.',
                      style: AppTextStyles.bodyM
                          .copyWith(color: AppColors.fg2, height: 1.6),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // License
                    if (psychologist.licenseNumber != null) ...[
                      Text('Nomor Izin Praktik', style: AppTextStyles.h3),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        psychologist.licenseNumber!,
                        style:
                            AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],

                    // Bottom padding for sticky button
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ],
        ),

        // Sticky booking button
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.sm,
              AppSpacing.screenPadding,
              AppSpacing.xl,
            ),
            decoration: BoxDecoration(
              color: AppColors.surfaceCanvas,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: FilledButton(
              onPressed: () =>
                  context.push('/home/telemedicine/${psychologist.id}/booking'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              child: Text('Buat Janji',
                  style: AppTextStyles.buttonL.copyWith(color: Colors.white)),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({
    required this.icon,
    required this.iconColor,
    required this.label,
  });

  final IconData icon;
  final Color iconColor;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: iconColor),
        const SizedBox(width: 4),
        Text(label, style: AppTextStyles.bodyS.copyWith(color: AppColors.fg2)),
      ],
    );
  }
}

class _PhotoFallback extends StatelessWidget {
  const _PhotoFallback({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.biru700,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: AppTextStyles.displayL.copyWith(color: Colors.white),
        ),
      ),
    );
  }
}
