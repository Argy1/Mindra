import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class CrisisScreen extends ConsumerWidget {
  const CrisisScreen({super.key});

  Future<void> _callHotline() async {
    // 119 ext 8 — Healing119.id, layanan dukungan psikologis awal Kementerian Kesehatan
    final uri = Uri(scheme: 'tel', path: '119,8');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 24),
          color: AppColors.fg2,
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.sm,
            AppSpacing.screenPadding,
            AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Pulsing heart
              Center(child: const _PulsingHeart()),
              const SizedBox(height: AppSpacing.lg),

              // Title
              Text(
                'Kamu Tidak Sendirian',
                style: AppTextStyles.displayM,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Ada bantuan yang siap menemanimu sekarang',
                style: AppTextStyles.bodyL.copyWith(
                  color: AppColors.fg3,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),

              // Primary hotline button (72px tall)
              _HotlineButton(onTap: _callHotline),
              const SizedBox(height: AppSpacing.xl),

              // Divider
              Row(
                children: [
                  const Expanded(
                    child: Divider(color: AppColors.borderSoft, thickness: 1),
                  ),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: Text(
                      'atau pilih cara lain',
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                    ),
                  ),
                  const Expanded(
                    child: Divider(color: AppColors.borderSoft, thickness: 1),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Secondary action cards
              _SecondaryCard(
                emoji: '🫁',
                title: 'Latihan Pernapasan',
                subtitle: 'Bantu dirimu tenang dalam 2 menit',
                onTap: () => context.push('/home/crisis/breathing'),
              ),
              const SizedBox(height: AppSpacing.sm),
              _SecondaryCard(
                emoji: '👥',
                title: 'Hubungi Orang Terdekatku',
                subtitle: 'Kontak darurat pribadimu',
                onTap: () => context.push('/home/crisis/contacts'),
              ),
              const SizedBox(height: AppSpacing.sm),
              _SecondaryCard(
                emoji: '📍',
                title: 'Cari Layanan Terdekat',
                subtitle: 'Rumah sakit jiwa & IGD di sekitarmu',
                onTap: () => context.push('/home/facilities'),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // Bottom encouragement
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.biru50,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Column(
                  children: [
                    Text(
                      'Merasa tertekan adalah hal yang manusiawi.',
                      style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.biru700,
                        height: 1.55,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Kamu sudah berani mencari bantuan.\nKami bangga padamu. 💙',
                      style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.biru700,
                        height: 1.55,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _PulsingHeart extends StatelessWidget {
  const _PulsingHeart();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 112,
      height: 112,
      decoration: const BoxDecoration(
        color: Color(0xFFFFEDE6), // soft coral background
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.favorite_rounded,
        color: AppColors.hangat500,
        size: 56,
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
          begin: const Offset(1, 1),
          end: const Offset(1.08, 1.08),
          duration: 1200.ms,
          curve: Curves.easeInOut,
        );
  }
}

class _HotlineButton extends StatelessWidget {
  const _HotlineButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          height: 72,
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.hangat500, Color(0xFFD9744F)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: [
              BoxShadow(
                color: AppColors.hangat500.withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.22),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.phone_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hubungi Hotline 119 ext 8',
                      style: AppTextStyles.buttonL
                          .copyWith(color: Colors.white, fontSize: 17),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Healing119.id (Kemenkes) • Gratis • Pagi hingga malam hari',
                      style: AppTextStyles.bodyS.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_rounded, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _SecondaryCard extends StatelessWidget {
  const _SecondaryCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String emoji;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surfaceCanvas,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.borderSoft),
                ),
                child: Center(
                  child: Text(emoji, style: const TextStyle(fontSize: 22)),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTextStyles.bodyM
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.fg4),
            ],
          ),
        ),
      ),
    );
  }
}
