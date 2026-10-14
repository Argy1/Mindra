import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/consultation_entity.dart';
import '../providers/telemedicine_provider.dart';

class ConsultationHistoryScreen extends ConsumerWidget {
  const ConsultationHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final consultationsAsync = ref.watch(userConsultationsProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Riwayat Konsultasi', style: AppTextStyles.h3),
      ),
      body: consultationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline,
                  color: AppColors.danger500, size: 40),
              const SizedBox(height: AppSpacing.sm),
              Text('Gagal memuat riwayat', style: AppTextStyles.bodyM),
              const SizedBox(height: AppSpacing.xs),
              TextButton(
                onPressed: () => ref.invalidate(userConsultationsProvider),
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
        data: (consultations) {
          if (consultations.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.calendar_today_outlined,
                      size: 56, color: AppColors.fg4),
                  const SizedBox(height: AppSpacing.md),
                  Text('Belum ada konsultasi',
                      style: AppTextStyles.h3.copyWith(color: AppColors.fg2)),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Jadwalkan konsultasi pertamamu\nbersama psikolog berpengalaman.',
                    style: AppTextStyles.bodyM
                        .copyWith(color: AppColors.fg3, height: 1.5),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  FilledButton.icon(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.search_rounded, size: 18),
                    label: const Text('Cari Psikolog'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.biru500,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          final upcoming = consultations
              .where((c) =>
                  c.status == ConsultationStatus.pending ||
                  c.status == ConsultationStatus.confirmed ||
                  c.status == ConsultationStatus.ongoing)
              .toList();
          final past = consultations
              .where((c) =>
                  c.status == ConsultationStatus.completed ||
                  c.status == ConsultationStatus.cancelled)
              .toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.sm,
              AppSpacing.screenPadding,
              AppSpacing.xxxl,
            ),
            children: [
              if (upcoming.isNotEmpty) ...[
                _SectionHeader(title: 'Mendatang', count: upcoming.length),
                ...upcoming.map((c) => _ConsultationTile(consultation: c)),
                const SizedBox(height: AppSpacing.lg),
              ],
              if (past.isNotEmpty) ...[
                _SectionHeader(
                    title: 'Selesai / Dibatalkan', count: past.length),
                ...past.map((c) => _ConsultationTile(consultation: c)),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.count});
  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Text(title, style: AppTextStyles.h4),
          const SizedBox(width: AppSpacing.xs),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.biru50,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Text(
              '$count',
              style: AppTextStyles.meta.copyWith(
                color: AppColors.biru600,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ConsultationTile extends StatelessWidget {
  const _ConsultationTile({required this.consultation});
  final Consultation consultation;

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEE, d MMM yyyy', 'id_ID');
    final tf = DateFormat('HH:mm', 'id_ID');

    final (statusLabel, statusColor, statusBg) = switch (consultation.status) {
      ConsultationStatus.pending => (
          'Menunggu',
          AppColors.biru600,
          AppColors.biru50
        ),
      ConsultationStatus.confirmed => (
          'Dikonfirmasi',
          AppColors.biru600,
          AppColors.biru50
        ),
      ConsultationStatus.ongoing => (
          'Berlangsung',
          AppColors.success500,
          AppColors.success50
        ),
      ConsultationStatus.completed => (
          'Selesai',
          AppColors.fg3,
          AppColors.neutral100
        ),
      ConsultationStatus.cancelled => (
          'Dibatalkan',
          AppColors.danger500,
          AppColors.danger50
        ),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Psychologist photo
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            child: consultation.psychologistPhotoUrl?.isNotEmpty == true
                ? Image.network(
                    consultation.psychologistPhotoUrl!,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        _MiniAvatar(name: consultation.psychologistName),
                  )
                : _MiniAvatar(name: consultation.psychologistName),
          ),
          const SizedBox(width: AppSpacing.sm),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name + status badge
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        consultation.psychologistName,
                        style: AppTextStyles.bodyM
                            .copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(AppRadius.xs),
                      ),
                      child: Text(
                        statusLabel,
                        style: AppTextStyles.meta.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (consultation.psychologistTitle?.isNotEmpty == true)
                  Text(
                    consultation.psychologistTitle!,
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                const SizedBox(height: AppSpacing.xs),

                // Date/time
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 13, color: AppColors.fg4),
                    const SizedBox(width: 4),
                    Text(
                      df.format(consultation.scheduledAt),
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    const Icon(Icons.access_time_rounded,
                        size: 13, color: AppColors.fg4),
                    const SizedBox(width: 4),
                    Text(
                      tf.format(consultation.scheduledAt),
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                    ),
                  ],
                ),

                // Join button for ongoing/upcoming that are joinable
                if (consultation.status == ConsultationStatus.ongoing) ...[
                  const SizedBox(height: AppSpacing.sm),
                  FilledButton.icon(
                    onPressed: () => context.push(
                      '/home/telemedicine/consultation/${consultation.id}',
                    ),
                    icon: const Icon(Icons.videocam_rounded, size: 16),
                    label: const Text('Masuk Sesi'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.success500,
                      minimumSize: const Size(0, 36),
                      padding:
                          const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniAvatar extends StatelessWidget {
  const _MiniAvatar({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      color: AppColors.biru100,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: AppTextStyles.h3.copyWith(color: AppColors.biru600),
        ),
      ),
    );
  }
}
