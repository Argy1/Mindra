import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';

/// Shows a bottom sheet asking the user whether to share the assessment result
/// with the SATUSEHAT national health platform (Kementerian Kesehatan RI).
///
/// Returns `true` if the user consents, `false` if they decline,
/// and `null` if the sheet is dismissed without a choice.
Future<bool?> showSatusehatConsentDialog(BuildContext context) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _SatusehatConsentSheet(),
  );
}

class _SatusehatConsentSheet extends StatelessWidget {
  const _SatusehatConsentSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.modal),
        ),
      ),
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.lg,
        AppSpacing.screenPadding,
        MediaQuery.of(context).padding.bottom + AppSpacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Handle ─────────────────────────────────────────────────
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.neutral300,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Logo + title ───────────────────────────────────────────
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F4FD),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Center(
                  child: Text(
                    'SS',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0066CC),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Kirim ke SATUSEHAT?', style: AppTextStyles.h3),
                    Text(
                      'Platform Kesehatan Nasional — Kemenkes RI',
                      style: AppTextStyles.bodyS,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Explanation ────────────────────────────────────────────
          Text(
            'Data yang akan dikirim:',
            style: AppTextStyles.h4,
          ),
          const SizedBox(height: AppSpacing.sm),
          ..._dataPoints.map(
            (point) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.check_circle_outline_rounded,
                    size: 16,
                    color: AppColors.sage500,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(point, style: AppTextStyles.bodyM),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Not sent ───────────────────────────────────────────────
          ..._notSentPoints.map(
            (point) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.remove_circle_outline_rounded,
                    size: 16,
                    color: AppColors.neutral400,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      point,
                      style: AppTextStyles.bodyM
                          .copyWith(color: AppColors.fg4),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ── Legal note ─────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.neutral100,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              'Pengiriman data dilakukan sesuai Permenkes No. 24 Tahun 2022 '
              'tentang Rekam Medis Elektronik. Data kamu dilindungi enkripsi '
              'dan tidak dibagikan ke pihak ketiga.',
              style: AppTextStyles.bodyS,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Actions ────────────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              child: Text(
                'Ya, kirim ke SATUSEHAT',
                style: AppTextStyles.buttonM,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                'Tidak, simpan lokal saja',
                style: AppTextStyles.buttonM.copyWith(
                  color: AppColors.fg3,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static const _dataPoints = [
    'Jenis asesmen (PHQ-9, GAD-7, PSS-10, SRQ-20)',
    'Skor total dan kategori tingkat keparahan',
    'Tanggal dan waktu penyelesaian asesmen',
  ];

  static const _notSentPoints = [
    'Jawaban per pertanyaan tidak dikirim',
    'Nama, nomor HP, atau lokasi tidak disertakan',
  ];
}
