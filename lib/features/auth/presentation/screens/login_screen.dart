import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_text_field.dart';
import '../../../../shared/widgets/mn_toast.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final ok = await ref.read(authProvider.notifier).signIn(
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
        );
    if (!mounted) return;
    if (ok) {
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenPadding,
            vertical: AppSpacing.xl,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSpacing.xxl),
                // Logo
                SvgPicture.asset('assets/logo-mindra.svg', height: 28),
                const SizedBox(height: AppSpacing.xxl),
                // Heading
                Text('Selamat datang\nkembali.',
                    style: AppTextStyles.displayL.copyWith(height: 1.15)),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Masuk untuk melanjutkan perjalananmu.',
                  style: AppTextStyles.bodyL.copyWith(color: AppColors.fg3),
                ),
                const SizedBox(height: AppSpacing.xxl),
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
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
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
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.xs),
                // Forgot password
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.push(AppRoutes.forgotPassword),
                    child: Text(
                      'Lupa kata sandi?',
                      style: AppTextStyles.label.copyWith(
                        color: AppColors.biru600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                // Submit
                MnButton(
                  label: 'Masuk',
                  onPressed: authState.isLoading ? null : _submit,
                  isLoading: authState.isLoading,
                ),
                const SizedBox(height: AppSpacing.md),
                // Divider
                Row(children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: Text('atau',
                        style: AppTextStyles.bodyS.copyWith(
                          color: AppColors.fg4,
                        )),
                  ),
                  const Expanded(child: Divider()),
                ]),
                const SizedBox(height: AppSpacing.md),
                // Register link
                MnButton(
                  label: 'Buat akun baru',
                  variant: MnButtonVariant.secondary,
                  onPressed: () => context.go(AppRoutes.register),
                ),
                const SizedBox(height: AppSpacing.xl),
                // Footer note
                Center(
                  child: Text(
                    'Dengan masuk, kamu menyetujui Syarat & Ketentuan Mindra.',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
