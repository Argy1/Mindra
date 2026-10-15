import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../satusehat/presentation/providers/satusehat_provider.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../providers/profile_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        title: Text('Profil', style: AppTextStyles.h3),
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Gagal memuat profil.')),
        data: (profile) => profile == null
            ? const Center(child: Text('Profil tidak ditemukan.'))
            : ListView(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                children: [
                  Center(
                    child: CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.biru100,
                      backgroundImage: profile.avatarUrl != null
                          ? NetworkImage(profile.avatarUrl!)
                          : null,
                      child: profile.avatarUrl == null
                          ? Text(
                              profile.name.isNotEmpty
                                  ? profile.name[0].toUpperCase()
                                  : '?',
                              style: AppTextStyles.displayM
                                  .copyWith(color: AppColors.biru700),
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Center(
                    child: Text(profile.name, style: AppTextStyles.h2),
                  ),
                  Center(
                    child: Text(profile.email,
                        style:
                            AppTextStyles.bodyS.copyWith(color: AppColors.fg3)),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  _SettingsTile(
                    icon: Icons.edit_outlined,
                    label: 'Edit Profil',
                    onTap: () => context.push(AppRoutes.editProfile),
                  ),
                  _SettingsTile(
                    icon: Icons.picture_as_pdf_outlined,
                    label: 'Laporan PDF',
                    onTap: () => context.push(AppRoutes.pdfReport),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Kesehatan Nasional',
                      style: AppTextStyles.bodyS.copyWith(
                        color: AppColors.fg4,
                        fontWeight: FontWeight.w700,
                      )),
                  const SizedBox(height: AppSpacing.xs),
                  const _SatusehatToggle(),
                  const SizedBox(height: AppSpacing.md),
                  _SettingsTile(
                    icon: Icons.notifications_outlined,
                    label: 'Notifikasi',
                    onTap: () => context.push(AppRoutes.notificationSettings),
                  ),
                  _SettingsTile(
                    icon: Icons.accessibility_new_rounded,
                    label: 'Aksesibilitas',
                    onTap: () => context.push(AppRoutes.accessibility),
                  ),
                  _SettingsTile(
                    icon: Icons.privacy_tip_outlined,
                    label: 'Privasi & Keamanan',
                    onTap: () => _showInfoSheet(
                      context,
                      title: 'Privasi & Keamanan',
                      icon: Icons.shield_outlined,
                      sections: _privacySections,
                    ),
                  ),
                  _SettingsTile(
                    icon: Icons.help_outline_rounded,
                    label: 'Bantuan',
                    onTap: () => _showInfoSheet(
                      context,
                      title: 'Pusat Bantuan',
                      icon: Icons.support_agent_outlined,
                      sections: _helpSections,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  _SettingsTile(
                    icon: Icons.logout_rounded,
                    label: 'Keluar',
                    color: AppColors.danger500,
                    onTap: () async {
                      await ref.read(authProvider.notifier).signOut();
                      if (context.mounted) context.go(AppRoutes.login);
                    },
                  ),
                  _SettingsTile(
                    icon: Icons.delete_forever_outlined,
                    label: 'Hapus Akun',
                    color: AppColors.danger700,
                    onTap: () => _confirmDeleteAccount(context, ref, profile),
                  ),
                ],
              ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hapus akun
// ─────────────────────────────────────────────────────────────────────────────

/// Dua langkah: dialog dengan kata penegas dan kata sandi, lalu fungsi database menghapus akun beserta SELURUH
/// datanya (skrining, jurnal, percakapan, konsultasi, izin, riwayat akses). Tidak bisa dibatalkan.
Future<void> _confirmDeleteAccount(
  BuildContext context,
  WidgetRef ref,
  UserProfileEntity profile,
) async {
  final deleted = await showDialog<bool>(
    context: context,
    builder: (_) => _DeleteAccountDialog(email: profile.email),
  );
  if (deleted == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
            'Akunmu dan seluruh datanya sudah dihapus. Terima kasih sudah memakai Mindra.'),
      ),
    );
    context.go(AppRoutes.login);
  }
}

class _DeleteAccountDialog extends ConsumerStatefulWidget {
  const _DeleteAccountDialog({required this.email});

  final String email;

  @override
  ConsumerState<_DeleteAccountDialog> createState() =>
      _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends ConsumerState<_DeleteAccountDialog> {
  static const _confirmWord = 'HAPUS';

  final _formKey = GlobalKey<FormState>();
  final _confirm = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _confirm.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(profileRepositoryProvider).deleteAccount(
            email: widget.email,
            password: _password.text,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = errorMessage(e,
            fallback: 'Akun belum bisa dihapus. Coba lagi sebentar lagi.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Hapus akunmu?'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Seluruh datamu ikut terhapus dan tidak bisa dikembalikan: skrining, jurnal, '
                'percakapan, konsultasi, izin ke psikolog dan pendamping, serta riwayat akses. '
                'Data yang sudah dikirim ke SATUSEHAT berada di luar kendali kami.',
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg2),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(_error!,
                    style: AppTextStyles.bodyS
                        .copyWith(color: AppColors.danger700),
                    semanticsLabel: 'Galat: $_error'),
              ],
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _confirm,
                enabled: !_busy,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                    labelText: 'Ketik $_confirmWord untuk melanjutkan'),
                validator: (value) => (value ?? '').trim() == _confirmWord
                    ? null
                    : 'Ketik $_confirmWord (huruf kapital) untuk melanjutkan.',
              ),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _password,
                enabled: !_busy,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Kata sandimu'),
                validator: (value) =>
                    (value ?? '').isEmpty ? 'Isi kata sandimu.' : null,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(false),
          child: const Text('Batal'),
        ),
        TextButton(
          onPressed: _busy ? null : _submit,
          style: TextButton.styleFrom(foregroundColor: AppColors.danger700),
          child: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Hapus akun saya'),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SATUSEHAT auto-sync toggle
// ─────────────────────────────────────────────────────────────────────────────

class _SatusehatToggle extends ConsumerWidget {
  const _SatusehatToggle();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final autoSync = ref.watch(satusehatAutoSyncProvider);
    final isMock = ref.watch(satusehatMockModeProvider);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F4FD),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Center(
                child: Text(
                  'SS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0066CC),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          'Kirim data otomatis ke SATUSEHAT',
                          style: AppTextStyles.bodyM
                              .copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () => _showExplanation(context, isMock),
                        child: const Icon(
                          Icons.info_outline_rounded,
                          size: 16,
                          color: AppColors.fg4,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    autoSync
                        ? 'Aktif — asesmen & konsultasi tersinkron'
                        : 'Nonaktif — data hanya tersimpan lokal',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                ],
              ),
            ),
            Switch.adaptive(
              value: autoSync,
              activeTrackColor: AppColors.biru500,
              onChanged: (value) => _onToggle(context, ref, value),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onToggle(
    BuildContext context,
    WidgetRef ref,
    bool value,
  ) async {
    if (value) {
      final consent = ref.read(satusehatConsentProvider);
      if (consent.granted) {
        await ref.read(satusehatAutoSyncProvider.notifier).setEnabled(true);
      } else {
        // Route through informed consent before enabling.
        context.push(AppRoutes.satusehatConsent);
      }
    } else {
      final confirmed = await _confirmDisable(context);
      if (confirmed != true) return;
      await ref.read(satusehatAutoSyncProvider.notifier).setEnabled(false);
      await ref.read(satusehatConsentProvider.notifier).revoke();
    }
  }

  Future<bool?> _confirmDisable(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        title: Text('Cabut persetujuan?', style: AppTextStyles.h3),
        content: Text(
          'Mindra akan berhenti mengirim data baru ke SATUSEHAT. '
          'Data yang sudah terkirim tetap tersimpan di rekam medis '
          'nasional sesuai regulasi.',
          style:
              AppTextStyles.bodyM.copyWith(color: AppColors.fg2, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Batal',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3)),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger500,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: Text('Cabut',
                style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showExplanation(BuildContext context, bool isMock) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        title: Text('Tentang SATUSEHAT', style: AppTextStyles.h3),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SATUSEHAT adalah platform rekam medis nasional milik '
              'Kementerian Kesehatan RI. Saat aktif, Mindra mengirim '
              'ringkasan hasil asesmen dan konsultasimu agar tercatat '
              'secara nasional.\n\n'
              'Hanya skor, kategori, dan identitas dasar yang dikirim — '
              'jawaban per pertanyaan, percakapan AI, dan jurnal tidak '
              'pernah dibagikan.',
              style: AppTextStyles.bodyM
                  .copyWith(color: AppColors.fg2, height: 1.55),
            ),
            if (isMock) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Catatan: kredensial SATUSEHAT belum dikonfigurasi, '
                'jadi aplikasi berjalan dalam mode pengembangan.',
                style:
                    AppTextStyles.bodyS.copyWith(color: AppColors.warning700),
              ),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.biru500,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: Text('Mengerti',
                style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.fg1;
    return ListTile(
      leading: Icon(icon, color: c),
      title: Text(label, style: AppTextStyles.bodyM.copyWith(color: c)),
      trailing:
          const Icon(Icons.chevron_right_rounded, color: AppColors.neutral400),
      onTap: onTap,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Info bottom sheet — Privacy & Security / Help Center
// ─────────────────────────────────────────────────────────────────────────────

typedef _InfoSection = ({String heading, String body});

const _privacySections = <_InfoSection>[
  (
    heading: 'Datamu terenkripsi',
    body: 'Rekaman jurnal suara dienkripsi dengan AES-256 di perangkatmu '
        'sebelum diunggah. Kunci enkripsi unik per pengguna dan tidak pernah '
        'meninggalkan ponselmu.',
  ),
  (
    heading: 'Hanya kamu yang bisa melihat',
    body: 'Keamanan tingkat baris (Row-Level Security) di basis data '
        'memastikan tidak ada pengguna lain yang dapat membaca datamu.',
  ),
  (
    heading: 'SATUSEHAT bersifat opt-in',
    body: 'Sinkronisasi ke rekam medis nasional hanya berjalan setelah kamu '
        'memberi izin. Catatan pribadi, jurnal suara, dan percakapan AI tidak '
        'pernah dibagikan.',
  ),
  (
    heading: 'Pendamping melihat seizinmu',
    body: 'Pendamping hanya melihat data yang kamu izinkan secara spesifik. '
        'Akses dapat kamu cabut kapan saja.',
  ),
  (
    heading: 'Kontrol penuh ada padamu',
    body: 'Kamu dapat mengekspor laporan atau menghapus akun beserta datamu '
        'kapan pun melalui menu profil.',
  ),
];

const _helpSections = <_InfoSection>[
  (
    heading: 'Dalam keadaan krisis',
    body: 'Tekan tombol "Bantuan" di beranda untuk sumber dukungan. '
        'Untuk bicara dengan konselor, hubungi Healing119.id di 119 ext. 8 (pagi hingga malam hari). '
        'Untuk bahaya yang sedang terjadi, hubungi 112 (24 jam).',
  ),
  (
    heading: 'Memulai',
    body: 'Mulai dengan satu asesmen singkat untuk melihat gambaran '
        'kondisimu, lalu catat suasana hatimu setiap hari.',
  ),
  (
    heading: 'Tentang asesmen',
    body: 'Tersedia PHQ-9, GAD-7, PSS-10, dan SRQ-20. Hasilnya adalah '
        'skrining — bukan diagnosis. Gunakan sebagai bahan diskusi dengan '
        'tenaga kesehatan jiwa.',
  ),
  (
    heading: 'Konsultasi & pendamping',
    body: 'Pesan sesi dengan psikolog lewat menu Konsultasi, atau undang '
        'orang terdekat lewat Mode Pendamping.',
  ),
  (
    heading: 'Masih butuh bantuan?',
    body: 'Hubungi tim kami di dukungan@mindra.app.',
  ),
];

void _showInfoSheet(
  BuildContext context, {
  required String title,
  required IconData icon,
  required List<_InfoSection> sections,
}) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppColors.surfaceCanvas,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius:
          BorderRadius.vertical(top: Radius.circular(AppRadius.modal)),
    ),
    builder: (_) => _InfoSheet(title: title, icon: icon, sections: sections),
  );
}

class _InfoSheet extends StatelessWidget {
  const _InfoSheet({
    required this.title,
    required this.icon,
    required this.sections,
  });

  final String title;
  final IconData icon;
  final List<_InfoSection> sections;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppSpacing.sm),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.neutral300,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.lg,
                AppSpacing.screenPadding,
                AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Icon(icon, color: AppColors.biru500, size: 22),
                  const SizedBox(width: AppSpacing.sm),
                  Text(title, style: AppTextStyles.h3),
                ],
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenPadding,
                  AppSpacing.sm,
                  AppSpacing.screenPadding,
                  AppSpacing.lg,
                ),
                itemCount: sections.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.md),
                itemBuilder: (_, i) {
                  final s = sections[i];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.heading,
                        style: AppTextStyles.bodyM.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.fg1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s.body,
                        style: AppTextStyles.bodyS.copyWith(
                          color: AppColors.fg3,
                          height: 1.55,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                0,
                AppSpacing.screenPadding,
                AppSpacing.md,
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.biru500,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                  ),
                  child: Text('Mengerti',
                      style:
                          AppTextStyles.buttonM.copyWith(color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
