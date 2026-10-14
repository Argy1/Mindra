import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/providers/accessibility_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class AccessibilitySettingsScreen extends ConsumerWidget {
  const AccessibilitySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(accessibilityProvider);
    final notifier = ref.read(accessibilityProvider.notifier);
    final reduceMotion = settings.reduceMotion;

    Widget section(Widget child, int index) {
      if (reduceMotion) return child;
      return child
          .animate(delay: Duration(milliseconds: 80 + index * 70))
          .fadeIn(duration: 260.ms, curve: Curves.easeOut)
          .slideY(begin: 0.04, end: 0, duration: 260.ms, curve: Curves.easeOut);
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('Aksesibilitas', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          // ── 1. Font size ─────────────────────────────────────────
          section(
            _SectionCard(
              icon: Icons.text_fields_rounded,
              title: 'Ukuran Teks',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sesuaikan ukuran teks di seluruh aplikasi.',
                    style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Segmented selector
                  _FontSizeSelector(
                    current: settings.fontSize,
                    onChanged: (size) {
                      HapticFeedback.selectionClick();
                      notifier.setFontSize(size);
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Live preview
                  _FontPreviewCard(fontSize: settings.fontSize),
                ],
              ),
            ),
            0,
          ),

          const SizedBox(height: AppSpacing.md),

          // ── 2. High contrast ─────────────────────────────────────
          section(
            _SectionCard(
              icon: Icons.contrast_rounded,
              title: 'Kontras Tinggi',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Tampilkan teks dan elemen dengan kontras lebih tinggi untuk keterbacaan yang lebih baik.',
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.fg3, height: 1.5),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Switch.adaptive(
                        value: settings.highContrast,
                        activeTrackColor: AppColors.biru500,
                        activeThumbColor: Colors.white,
                        onChanged: (v) {
                          HapticFeedback.selectionClick();
                          notifier.setHighContrast(v);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _ContrastPreview(highContrast: settings.highContrast),
                ],
              ),
            ),
            1,
          ),

          const SizedBox(height: AppSpacing.md),

          // ── 3. Language mode ─────────────────────────────────────
          section(
            _SectionCard(
              icon: Icons.translate_rounded,
              title: 'Gaya Bahasa',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pilih gaya bahasa yang paling nyaman untukmu.',
                    style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _LanguageModeSelector(
                    current: settings.languageMode,
                    onChanged: (mode) {
                      HapticFeedback.selectionClick();
                      notifier.setLanguageMode(mode);
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _LanguagePreview(mode: settings.languageMode),
                ],
              ),
            ),
            2,
          ),

          const SizedBox(height: AppSpacing.md),

          // ── 4. Reduce motion ─────────────────────────────────────
          section(
            _SectionCard(
              icon: Icons.motion_photos_off_outlined,
              title: 'Kurangi Gerakan',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Nonaktifkan animasi dan transisi untuk pengalaman yang lebih tenang.',
                              style: AppTextStyles.bodyM
                                  .copyWith(color: AppColors.fg3, height: 1.5),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Juga mengikuti setelan aksesibilitas sistem.',
                              style: AppTextStyles.bodyS
                                  .copyWith(color: AppColors.fg4),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Switch.adaptive(
                        value: settings.reduceMotion,
                        activeTrackColor: AppColors.biru500,
                        activeThumbColor: Colors.white,
                        onChanged: (v) {
                          HapticFeedback.selectionClick();
                          notifier.setReduceMotion(v);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            3,
          ),

          const SizedBox(height: AppSpacing.xl),

          // Info footer
          section(
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.biru50,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded,
                      size: 16, color: AppColors.biru500),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      'Semua setelan aksesibilitas tersimpan otomatis dan berlaku di seluruh aplikasi.',
                      style: AppTextStyles.bodyS
                          .copyWith(color: AppColors.biru700, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
            4,
          ),

          SizedBox(height: MediaQuery.of(context).padding.bottom + 24),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section card wrapper
// ─────────────────────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.biru500),
              const SizedBox(width: AppSpacing.xs),
              Text(title,
                  style: AppTextStyles.h4
                      .copyWith(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          child,
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Font size selector
// ─────────────────────────────────────────────────────────────────────────────

class _FontSizeSelector extends StatelessWidget {
  const _FontSizeSelector({required this.current, required this.onChanged});

  final FontSize current;
  final ValueChanged<FontSize> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: FontSize.values.map((size) {
        final selected = size == current;
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(size),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color:
                    selected ? AppColors.biru500 : AppColors.surfaceCanvas,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: selected
                      ? AppColors.biru500
                      : AppColors.borderMedium,
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Aa',
                    style: TextStyle(
                      fontSize: 10 + (FontSize.values.indexOf(size) * 2.0),
                      fontWeight: FontWeight.w700,
                      color:
                          selected ? Colors.white : AppColors.fg2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    size.label,
                    style: TextStyle(
                      fontSize: 9,
                      color: selected
                          ? Colors.white.withValues(alpha: 0.85)
                          : AppColors.fg4,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Font preview card
// ─────────────────────────────────────────────────────────────────────────────

class _FontPreviewCard extends StatelessWidget {
  const _FontPreviewCard({required this.fontSize});

  final FontSize fontSize;

  @override
  Widget build(BuildContext context) {
    // Show preview at actual current scale (textScaler already applied app-wide)
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.biru100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Pratinjau teks',
            style: AppTextStyles.label.copyWith(color: AppColors.biru600),
          ),
          const SizedBox(height: 6),
          Text(
            'Mindra mendampingi perjalananmu.',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg1),
          ),
          const SizedBox(height: 2),
          Text(
            'Catatan harian, asesmen, dan refleksi malam tersedia di sini.',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
          ),
          const SizedBox(height: 2),
          Text(
            'Skala saat ini: ×${fontSize.scaleFactor.toStringAsFixed(2)}',
            style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrast preview
// ─────────────────────────────────────────────────────────────────────────────

class _ContrastPreview extends StatelessWidget {
  const _ContrastPreview({required this.highContrast});

  final bool highContrast;

  @override
  Widget build(BuildContext context) {
    final bg = highContrast ? Colors.white : AppColors.neutral100;
    final textColor = highContrast ? const Color(0xFF0A0A0A) : AppColors.fg2;
    final subColor = highContrast ? const Color(0xFF333333) : AppColors.fg4;
    final borderColor =
        highContrast ? const Color(0xFF888888) : AppColors.borderSoft;
    final accentColor =
        highContrast ? const Color(0xFF0044AA) : AppColors.biru500;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: borderColor, width: highContrast ? 2 : 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Contoh Judul',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: textColor,
                    )),
                const SizedBox(height: 2),
                Text('Teks deskripsi di bawah judul.',
                    style: TextStyle(
                        fontSize: 13,
                        color: subColor,
                        height: 1.4)),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: accentColor,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Text(
              'Tombol',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Language mode selector
// ─────────────────────────────────────────────────────────────────────────────

class _LanguageModeSelector extends StatelessWidget {
  const _LanguageModeSelector(
      {required this.current, required this.onChanged});

  final LanguageMode current;
  final ValueChanged<LanguageMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: LanguageMode.values.map((mode) {
        final selected = mode == current;
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(mode),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.biru500
                    : AppColors.surfaceCanvas,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: selected
                      ? AppColors.biru500
                      : AppColors.borderMedium,
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    mode == LanguageMode.formal ? '👔' : '😊',
                    style: const TextStyle(fontSize: 20),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    mode.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : AppColors.fg2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Language preview
// ─────────────────────────────────────────────────────────────────────────────

class _LanguagePreview extends StatelessWidget {
  const _LanguagePreview({required this.mode});

  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    final examples = [
      AppStrings.howAreYouToday(mode),
      AppStrings.letsStart(mode),
      AppStrings.letsCheckIn(mode),
    ];

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Container(
        key: ValueKey(mode),
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.sage50,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.sage100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              mode == LanguageMode.formal ? 'Gaya formal:' : 'Gaya santai:',
              style: AppTextStyles.label.copyWith(color: AppColors.sage600),
            ),
            const SizedBox(height: 6),
            ...examples.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ',
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.sage500)),
                      Expanded(
                        child: Text(
                          e,
                          style: AppTextStyles.bodyM
                              .copyWith(color: AppColors.fg2, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}
