import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/legal.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_text_field.dart';
import '../../../../shared/widgets/mn_toast.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _agreed = false;
  bool _agreedTouched = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _agreedTouched = true);
    final formOk = _formKey.currentState?.validate() ?? false;
    if (!formOk || !_agreed) return;
    final ok = await ref.read(authProvider.notifier).signUp(
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
          name: _nameCtrl.text.trim(),
        );
    if (!mounted) return;
    if (ok) {
      MnToast.show(
        context,
        kind: MnToastKind.success,
        title: 'Akun berhasil dibuat',
        message: 'Selamat datang di Mindra, ${_nameCtrl.text.trim()}.',
      );
      context.go(AppRoutes.home);
    } else {
      final error = ref.read(authProvider).error;
      if (error != null) {
        MnToast.show(context, kind: MnToastKind.error, title: error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.go(AppRoutes.login),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenPadding,
            vertical: AppSpacing.md,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SvgPicture.asset('assets/logo-mindra.svg', height: 24),
                const SizedBox(height: AppSpacing.xl),
                Text('Buat akunmu.',
                    style: AppTextStyles.displayL.copyWith(height: 1.15)),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Gratis. Aman. Hanya untukmu.',
                  style: AppTextStyles.bodyL.copyWith(color: AppColors.fg3),
                ),
                const SizedBox(height: AppSpacing.xxl),
                // Name
                MnTextField(
                  controller: _nameCtrl,
                  label: 'Nama panggilan',
                  hint: 'Apa yang ingin kami panggil kamu?',
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Nama wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                // Email
                MnTextField(
                  controller: _emailCtrl,
                  label: 'Alamat email',
                  hint: 'kamu@contoh.com',
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Email wajib diisi';
                    if (!v.contains('@')) return 'Format email tidak valid';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                // Password
                MnTextField(
                  controller: _passwordCtrl,
                  label: 'Kata sandi',
                  obscureText: _obscurePassword,
                  helper: 'Minimal 6 karakter',
                  textInputAction: TextInputAction.next,
                  suffixIcon: GestureDetector(
                    onTap: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    child: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: AppColors.neutral400,
                      size: 20,
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Kata sandi wajib diisi';
                    if (v.length < 6) return 'Minimal 6 karakter';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                // Confirm password
                MnTextField(
                  controller: _confirmCtrl,
                  label: 'Ulangi kata sandi',
                  obscureText: _obscureConfirm,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  suffixIcon: GestureDetector(
                    onTap: () =>
                        setState(() => _obscureConfirm = !_obscureConfirm),
                    child: Icon(
                      _obscureConfirm
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: AppColors.neutral400,
                      size: 20,
                    ),
                  ),
                  validator: (v) {
                    if (v != _passwordCtrl.text) {
                      return 'Kata sandi tidak cocok';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                // Persetujuan dan usia dinyatakan SENDIRI oleh pengguna (bukan teks pasif), dan versinya dicatat.
                CheckboxListTile(
                  value: _agreed,
                  onChanged: (value) =>
                      setState(() => _agreed = value ?? false),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    'Saya berusia $kMinAge tahun ke atas dan menyetujui Syarat & Ketentuan '
                    'serta Kebijakan Privasi Mindra.',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg2),
                  ),
                  subtitle: _agreedTouched && !_agreed
                      ? Text(
                          'Centang dulu untuk melanjutkan.',
                          style: AppTextStyles.bodyS
                              .copyWith(color: AppColors.danger700),
                        )
                      : null,
                ),
                const SizedBox(height: AppSpacing.xl),
                MnButton(
                  label: 'Daftar sekarang',
                  onPressed: authState.isLoading ? null : _submit,
                  isLoading: authState.isLoading,
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
