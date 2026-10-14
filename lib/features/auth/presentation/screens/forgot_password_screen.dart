import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../../../../shared/widgets/mn_text_field.dart';
import '../../../../shared/widgets/mn_toast.dart';
import '../../../../core/providers/supabase_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _isLoading = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      await ref
          .read(supabaseProvider)
          .auth
          .resetPasswordForEmail(_emailCtrl.text.trim());
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      if (mounted) {
        MnToast.show(
          context,
          kind: MnToastKind.error,
          title: 'Gagal mengirim tautan',
          message: e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenPadding,
          ),
          child: _sent
              ? _SuccessView(email: _emailCtrl.text.trim())
              : _FormView(
                  formKey: _formKey,
                  emailCtrl: _emailCtrl,
                  isLoading: _isLoading,
                  onSubmit: _submit,
                ),
        ),
      ),
    );
  }
}

class _FormView extends StatelessWidget {
  const _FormView({
    required this.formKey,
    required this.emailCtrl,
    required this.isLoading,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final bool isLoading;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.lg),
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.biru100,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.lock_reset_rounded,
                color: AppColors.biru600, size: 26),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Lupa Kata Sandi?', style: AppTextStyles.displayM),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Masukkan email yang kamu daftarkan. Kami akan mengirimkan tautan untuk membuat kata sandi baru.',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
          ),
          const SizedBox(height: AppSpacing.xxl),
          MnTextField(
            controller: emailCtrl,
            label: 'Email',
            hint: 'nama@email.com',
            keyboardType: TextInputType.emailAddress,
            prefixIcon: const Icon(Icons.mail_outline_rounded),
            validator: MindraValidators.email,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onSubmit(),
          ),
          const SizedBox(height: AppSpacing.xl),
          MnButton(
            label: 'Kirim Tautan Reset',
            onPressed: isLoading ? null : onSubmit,
            isLoading: isLoading,
          ),
        ],
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.email});
  final String email;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: AppSpacing.lg),
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.success50,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: const Icon(Icons.mark_email_read_outlined,
              color: AppColors.success500, size: 26),
        ),
        const SizedBox(height: AppSpacing.xl),
        Text('Email Terkirim!', style: AppTextStyles.displayM),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Kami mengirimkan tautan reset kata sandi ke:',
          style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          email,
          style: AppTextStyles.bodyM.copyWith(
            color: AppColors.biru600,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Periksa folder spam jika email tidak muncul dalam beberapa menit.',
          style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
        ),
        const SizedBox(height: AppSpacing.xxl),
        MnButton(
          label: 'Kembali ke Masuk',
          onPressed: () => context.pop(),
          variant: MnButtonVariant.secondary,
        ),
      ],
    );
  }
}
