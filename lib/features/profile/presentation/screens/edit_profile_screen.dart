import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_scaffold.dart';
import '../../../../shared/widgets/mn_text_field.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/region.dart';
import '../providers/profile_provider.dart';

/// Edit profil: nama, kota, provinsi, dan persetujuan ikut statistik wilayah anonim.
///
/// Kota dan provinsi dipakai SATU hal saja: menempatkan pengguna yang MEMILIH ikut ke angka gabungan anonim milik
/// puskesmas dan dinas di provinsinya (hanya tampil bila minimal 10 orang). Tanpa persetujuan, datanya tidak dihitung.
/// Aturan isiannya sama dengan halaman Profil web (lib/domain/region di web).
class EditProfileScreen extends ConsumerWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileNotifierProvider);

    return MnScaffold(
      title: 'Edit Profil',
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        tooltip: 'Kembali',
        onPressed: () => context.pop(),
      ),
      showSos: false,
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Gagal memuat profil.')),
        data: (profile) => profile == null
            ? const Center(child: Text('Profil tidak ditemukan.'))
            : EditProfileForm(profile: profile),
      ),
    );
  }
}

class EditProfileForm extends ConsumerStatefulWidget {
  const EditProfileForm({super.key, required this.profile});

  final UserProfileEntity profile;

  @override
  ConsumerState<EditProfileForm> createState() => _EditProfileFormState();
}

class _EditProfileFormState extends ConsumerState<EditProfileForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name =
      TextEditingController(text: widget.profile.name);
  late final TextEditingController _city =
      TextEditingController(text: widget.profile.city ?? '');
  late String? _province = canonicalProvince(widget.profile.province);
  late bool _share = widget.profile.shareRegionStats;
  String? _provinceError;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final formOk = _formKey.currentState?.validate() ?? false;
    final consent = validateRegionConsent(
      share: _share,
      city: _city.text,
      province: _province,
    );
    setState(() => _provinceError = consent.province);
    // Kota diperiksa lewat validator kolom; kombinasi ikut-tanpa-kota ditangani di sini.
    if (!formOk || consent.city != null || consent.province != null) {
      if (consent.city != null) {
        _show(consent.city!, error: true);
      }
      return;
    }

    setState(() => _saving = true);
    try {
      final updated =
          widget.profile.copyWith(name: _name.text.trim()).withRegion(
                city: normalizeCity(_city.text),
                province: _province,
                shareRegionStats: _share,
              );
      await ref.read(profileNotifierProvider.notifier).save(updated);
      if (!mounted) return;
      _show('Profilmu sudah diperbarui.');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      _show(
          errorMessage(e,
              fallback: 'Profil belum tersimpan. Coba lagi sebentar lagi.'),
          error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _show(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? AppColors.danger700 : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          MnTextField(
            controller: _name,
            label: 'Nama panggilan',
            textInputAction: TextInputAction.next,
            validator: validateName,
          ),
          const SizedBox(height: AppSpacing.md),
          MnTextField(
            controller: _city,
            label: 'Kota atau kabupaten (opsional)',
            helper:
                'Tulis seperti nama resminya, mis. Kota Bogor atau Kab. Cianjur.',
            textInputAction: TextInputAction.next,
            validator: validateCity,
          ),
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<String>(
            initialValue: _province,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: 'Provinsi (opsional)',
              errorText: _provinceError,
            ),
            items: [
              for (final province in kProvinces)
                DropdownMenuItem(value: province, child: Text(province)),
            ],
            onChanged: (value) => setState(() {
              _province = value;
              _provinceError = null;
            }),
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceSunken,
              borderRadius: BorderRadius.circular(16),
            ),
            child: SwitchListTile(
              value: _share,
              onChanged: (value) => setState(() => _share = value),
              title: Text('Ikut statistik wilayah anonim',
                  style: AppTextStyles.bodyM.copyWith(
                      color: AppColors.fg1, fontWeight: FontWeight.w700)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Kotamu dihitung dalam angka gabungan untuk puskesmas dan dinas kesehatan '
                  'di provinsimu, supaya layanan bisa direncanakan lebih tepat. Tanpa namamu, '
                  'dan hanya tampil bila sedikitnya 10 orang di kota dan pekan yang sama. '
                  'Mati bawaannya, dan bisa kamu matikan kapan saja.',
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          MnButton(
            label: 'Simpan profil',
            isLoading: _saving,
            onPressed: _saving ? null : _save,
          ),
        ],
      ),
    );
  }
}
