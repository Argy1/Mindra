import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/caregiver_provider.dart';

class CaregiverInviteScreen extends ConsumerStatefulWidget {
  const CaregiverInviteScreen({super.key});

  @override
  ConsumerState<CaregiverInviteScreen> createState() =>
      _CaregiverInviteScreenState();
}

class _CaregiverInviteScreenState
    extends ConsumerState<CaregiverInviteScreen> {
  final _codeCtrl = TextEditingController();

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final state = ref.watch(caregiverPatientsProvider);
    final notifier = ref.read(caregiverPatientsProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Terima Undangan', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Hero
          const Center(
            child: Text('💙', style: TextStyle(fontSize: 72)),
          ),
          const SizedBox(height: 20),
          Text(
            'Terima Undangan Pendamping',
            style: AppTextStyles.h3.copyWith(color: AppColors.fg1),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          Text(
            'Seseorang mengundangmu untuk mendampingi perjalanan kesehatan mentalnya. Masukkan kode yang mereka bagikan.',
            style: AppTextStyles.bodyM
                .copyWith(color: AppColors.fg3, height: 1.6),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 36),

          // Code input
          TextField(
            controller: _codeCtrl,
            textCapitalization: TextCapitalization.characters,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: 8,
              color: AppColors.biru600,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
            decoration: InputDecoration(
              hintText: 'XXXXXXXX',
              hintStyle: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 8,
                color: AppColors.fg4.withValues(alpha: 0.5),
              ),
              filled: true,
              fillColor: AppColors.biru50,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.biru200)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.biru200)),
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide:
                      const BorderSide(color: AppColors.biru400, width: 2)),
            ),
          ),

          const SizedBox(height: 16),

          if (state.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(state.error!,
                  style: AppTextStyles.bodyM
                      .copyWith(color: AppColors.danger500),
                  textAlign: TextAlign.center),
            ),

          // What they can see
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sebagai pendamping, kamu akan melihat:',
                    style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.fg2, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                ...[
                  '📊 Data yang diizinkan pengguna (mood, aktivitas)',
                  '🔔 Notifikasi darurat jika diaktifkan',
                  '📚 Panduan mendampingi',
                ].map((t) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.substring(0, 2),
                              style: const TextStyle(fontSize: 14)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(t.substring(3),
                                style: AppTextStyles.bodyM
                                    .copyWith(color: AppColors.fg3)),
                          ),
                        ],
                      ),
                    )),
                const Divider(height: 16),
                Row(
                  children: [
                    const Icon(Icons.lock_outline,
                        size: 14, color: AppColors.sage500),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Catatan pribadi, rekaman suara, dan jurnal tidak pernah dibagikan.',
                        style: AppTextStyles.label
                            .copyWith(color: AppColors.sage600, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),

          FilledButton(
            onPressed: state.isLoading || user == null
                ? null
                : () async {
                    final code = _codeCtrl.text.trim();
                    if (code.length < 6) return;
                    final ok = await notifier.acceptInvite(code, user.id);
                    if (ok && mounted) {
                      context.pop();
                      _showSuccessSnack(context);
                    }
                  },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.sage500,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 16),
              minimumSize: const Size(double.infinity, 0),
            ),
            child: state.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : Text('Terima & Sambungkan',
                    style: AppTextStyles.bodyM.copyWith(
                        color: Colors.white, fontWeight: FontWeight.w600)),
          ),

          const SizedBox(height: 12),

          TextButton(
            onPressed: () => context.pop(),
            child: Text('Tolak',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
          ),
        ],
      ),
    );
  }

  void _showSuccessSnack(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Berhasil terhubung sebagai pendamping 💙'),
        backgroundColor: AppColors.sage500,
      ),
    );
  }
}
