import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/satusehat_provider.dart';

/// Informed-consent screen shown before any data is sent to SATUSEHAT.
///
/// On "Setuju & Kirim Data": records consent, enables auto-sync, and kicks
/// off an initial sync of existing records.
class SatusehatConsentScreen extends ConsumerWidget {
  const SatusehatConsentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isMock = ref.watch(satusehatMockModeProvider);
    final syncState = ref.watch(satusehatSyncControllerProvider);
    final isBusy = syncState.isLoading;

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
        title: Text('Integrasi SATUSEHAT', style: AppTextStyles.h3),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F4FD),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: const Center(
                          child: Text(
                            'SS',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0066CC),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('SATUSEHAT', style: AppTextStyles.h2),
                            Text(
                              'Platform Kesehatan Nasional — Kemenkes RI',
                              style: AppTextStyles.bodyS
                                  .copyWith(color: AppColors.fg3),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Mindra dapat mengirim ringkasan kesehatan jiwamu ke '
                    'SATUSEHAT agar tercatat dalam rekam medis nasional dan '
                    'bisa diakses oleh tenaga kesehatan saat kamu butuh '
                    'penanganan lanjutan.',
                    style: AppTextStyles.bodyM
                        .copyWith(color: AppColors.fg2, height: 1.6),
                  ),

                  if (isMock) ...[
                    const SizedBox(height: AppSpacing.md),
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: AppColors.warning50,
                        borderRadius:
                            BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.science_outlined,
                              size: 16, color: AppColors.warning700),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              'Mode pengembangan: kredensial SATUSEHAT '
                              'belum dikonfigurasi. Data tidak benar-benar '
                              'dikirim.',
                              style: AppTextStyles.bodyS
                                  .copyWith(color: AppColors.warning700),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.xl),

                  // What is shared
                  const _SectionTitle(
                    icon: Icons.upload_file_rounded,
                    title: 'Data yang dibagikan',
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._sharedData.map((t) => _Bullet(
                        text: t,
                        icon: Icons.check_circle_outline_rounded,
                        color: AppColors.sage500,
                      )),
                  const SizedBox(height: AppSpacing.sm),
                  ..._notShared.map((t) => _Bullet(
                        text: t,
                        icon: Icons.remove_circle_outline_rounded,
                        color: AppColors.neutral400,
                        muted: true,
                      )),

                  const SizedBox(height: AppSpacing.xl),

                  // How it is used
                  const _SectionTitle(
                    icon: Icons.health_and_safety_outlined,
                    title: 'Bagaimana data digunakan',
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._usage.map((t) => _Bullet(
                        text: t,
                        icon: Icons.arrow_right_rounded,
                        color: AppColors.biru500,
                      )),

                  const SizedBox(height: AppSpacing.xl),

                  // Who can access
                  const _SectionTitle(
                    icon: Icons.groups_outlined,
                    title: 'Siapa yang dapat mengakses',
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._access.map((t) => _Bullet(
                        text: t,
                        icon: Icons.arrow_right_rounded,
                        color: AppColors.biru500,
                      )),

                  const SizedBox(height: AppSpacing.xl),

                  // Revocation
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.biru50,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.lock_open_rounded,
                            size: 18, color: AppColors.biru600),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            'Kamu bisa mencabut persetujuan kapan saja '
                            'melalui Profil → "Kirim data otomatis ke '
                            'SATUSEHAT". Data yang sudah terkirim tetap '
                            'tersimpan di rekam medis nasional sesuai '
                            'regulasi.',
                            style: AppTextStyles.bodyS.copyWith(
                              color: AppColors.biru800,
                              height: 1.55,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.md),

                  // Expandable full policy
                  Theme(
                    data: Theme.of(context)
                        .copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding:
                          const EdgeInsets.only(bottom: AppSpacing.sm),
                      title: Text(
                        'Kebijakan privasi lengkap',
                        style: AppTextStyles.bodyM.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.biru600,
                        ),
                      ),
                      children: [
                        Text(
                          _fullPolicy,
                          style: AppTextStyles.bodyS.copyWith(
                            color: AppColors.fg2,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),
                ],
              ),
            ),

            // Sticky actions
            Container(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.sm,
                AppSpacing.screenPadding,
                AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: AppColors.surfaceCanvas,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 12,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FilledButton(
                    onPressed: isBusy
                        ? null
                        : () => _onConsent(context, ref),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.biru500,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(AppRadius.pill),
                      ),
                    ),
                    child: isBusy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : Text('Setuju & Kirim Data',
                            style: AppTextStyles.buttonL
                                .copyWith(color: Colors.white)),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  TextButton(
                    onPressed: isBusy ? null : () => context.pop(),
                    child: Text(
                      'Tidak Sekarang',
                      style: AppTextStyles.buttonM
                          .copyWith(color: AppColors.fg3),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onConsent(BuildContext context, WidgetRef ref) async {
    await ref.read(satusehatConsentProvider.notifier).grant();
    await ref.read(satusehatAutoSyncProvider.notifier).setEnabled(true);
    await ref.read(satusehatSyncControllerProvider.notifier).syncAll();

    if (!context.mounted) return;
    final state = ref.read(satusehatSyncControllerProvider);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          state.hasError
              ? 'Sebagian data gagal dikirim — akan dicoba lagi otomatis.'
              : 'Data berhasil dikirim ke SATUSEHAT.',
        ),
        backgroundColor:
            state.hasError ? AppColors.warning700 : AppColors.success500,
      ),
    );
    context.pop();
  }

  // ── Content ────────────────────────────────────────────────────────────────

  static const _sharedData = [
    'Jenis asesmen (PHQ-9, GAD-7, PSS-10, SRQ-20)',
    'Skor total dan kategori tingkat keparahan',
    'Tanggal dan waktu penyelesaian asesmen',
    'Catatan konsultasi daring (waktu & status sesi)',
    'Identitas dasar: nama, NIK, tanggal lahir, jenis kelamin',
  ];

  static const _notShared = [
    'Jawaban per pertanyaan tidak dikirim',
    'Isi percakapan dengan AI tidak dikirim',
    'Catatan jurnal & mood harian tidak dikirim',
  ];

  static const _usage = [
    'Tercatat sebagai Observasi & Encounter FHIR pada rekam medis nasional',
    'Membantu tenaga kesehatan memahami riwayatmu saat rujukan',
    'Mendukung kesinambungan perawatan antar fasilitas kesehatan',
  ];

  static const _access = [
    'Tenaga kesehatan berlisensi yang menanganimu',
    'Fasilitas kesehatan tempat kamu dirujuk atau berobat',
    'Tidak dibagikan ke pihak ketiga non-kesehatan atau untuk iklan',
  ];

  static const _fullPolicy =
      'Mindra mengirim data ke SATUSEHAT sesuai Peraturan Menteri Kesehatan '
      'No. 24 Tahun 2022 tentang Rekam Medis Elektronik dan UU No. 27 Tahun '
      '2022 tentang Pelindungan Data Pribadi.\n\n'
      'Seluruh transmisi data dienkripsi (TLS) dan diautentikasi melalui '
      'OAuth 2.0. Data disimpan pada infrastruktur SATUSEHAT milik '
      'Kementerian Kesehatan RI.\n\n'
      'Persetujuan bersifat sukarela. Kamu dapat mencabutnya kapan saja; '
      'pencabutan menghentikan pengiriman data baru. Data yang telah '
      'tercatat di rekam medis nasional mengikuti ketentuan retensi rekam '
      'medis yang berlaku.\n\n'
      'Untuk pertanyaan atau permintaan terkait data pribadimu, hubungi '
      'tim dukungan Mindra melalui menu Bantuan.';
}

// ─────────────────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});
  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.biru600),
        const SizedBox(width: AppSpacing.xs),
        Text(title, style: AppTextStyles.h4),
      ],
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet({
    required this.text,
    required this.icon,
    required this.color,
    this.muted = false,
  });

  final String text;
  final IconData icon;
  final Color color;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.bodyM.copyWith(
                color: muted ? AppColors.fg4 : AppColors.fg2,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
