import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class CaregiverScreen extends ConsumerWidget {
  const CaregiverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Mode Pendamping', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Hero section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2E6DA4), Color(0xFF4A9E8F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🤝', style: TextStyle(fontSize: 40)),
                const SizedBox(height: 12),
                Text('Dukungan Bersama',
                    style: AppTextStyles.h3.copyWith(color: Colors.white)),
                const SizedBox(height: 6),
                Text(
                  'Izinkan orang-orang terdekatmu mendampingi perjalanan kesehatan mentalmu — dengan privasimu tetap terjaga.',
                  style: AppTextStyles.bodyM
                      .copyWith(color: Colors.white70, height: 1.5),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          Text('Saya ingin...', style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
          const SizedBox(height: 14),

          // Card: As Patient
          _RoleCard(
            emoji: '🌱',
            title: 'Mengundang Pendampingku',
            subtitle:
                'Beri akses terbatas kepada keluarga atau teman yang ingin mendukungmu.',
            color: AppColors.biru500,
            bgColor: AppColors.biru50,
            onTap: () => context.push('/home/caregiver/setup'),
          ),

          const SizedBox(height: 12),

          // Card: As Caregiver (accept invite)
          _RoleCard(
            emoji: '💙',
            title: 'Mendampingi Seseorang',
            subtitle:
                'Masukkan kode undangan untuk memantau kondisi orang yang kamu cintai.',
            color: AppColors.sage500,
            bgColor: AppColors.sage50,
            onTap: () => context.push('/home/caregiver/invite'),
          ),

          const SizedBox(height: 12),

          // Card: Education
          _RoleCard(
            emoji: '📚',
            title: 'Panduan Mendampingi',
            subtitle:
                'Artikel dan tips dari para ahli tentang cara mendampingi dengan efektif.',
            color: AppColors.matahari500,
            bgColor: AppColors.matahari50,
            onTap: () => context.push('/home/caregiver/education'),
          ),

          const SizedBox(height: 28),

          // Privacy note
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield_outlined,
                    size: 18, color: AppColors.sage500),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Privasi terlindungi',
                          style: AppTextStyles.bodyM.copyWith(
                              color: AppColors.fg1,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(
                        'Pendampingmu hanya melihat data yang kamu izinkan. Catatan pribadi, rekaman suara, dan jurnal tidak pernah dibagikan.',
                        style: AppTextStyles.bodyM
                            .copyWith(color: AppColors.fg3, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  final String emoji, title, subtitle;
  final Color color, bgColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSoft),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                  color: bgColor, borderRadius: BorderRadius.circular(12)),
              child:
                  Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: AppTextStyles.bodyM.copyWith(
                          color: AppColors.fg1,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  Text(subtitle,
                      style: AppTextStyles.bodyM
                          .copyWith(color: AppColors.fg4, fontSize: 13),
                      maxLines: 2),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppColors.fg4, size: 20),
          ],
        ),
      ),
    );
  }
}
