import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';

class _OnboardingPage {
  const _OnboardingPage({
    required this.title,
    required this.subtitle,
    required this.body,
    required this.illustrationAsset,
    required this.bgGradientColors,
  });

  final String title;
  final String subtitle;
  final String body;
  final String illustrationAsset;
  final List<Color> bgGradientColors;
}

const _pages = [
  _OnboardingPage(
    title: 'Halo.',
    subtitle: 'Senang kamu di sini.',
    body: 'Mindra menemanimu pelan-pelan — satu napas, satu catatan, satu hari pada satu waktu.',
    illustrationAsset: 'assets/illustration-orb.svg',
    bgGradientColors: [Color(0x5984A7C1), Color(0x3F9DB287)],
  ),
  _OnboardingPage(
    title: 'Tidak ada yang salah',
    subtitle: 'dengan merasa tidak baik-baik saja.',
    body: 'Mindra bukan dokter. Bukan klinik. Tapi teman yang mendengar dan menemani, kapan pun kamu butuh.',
    illustrationAsset: 'assets/illustration-pebbles.svg',
    bgGradientColors: [Color(0x5984A7C1), Color(0x3F9DB287)],
  ),
  _OnboardingPage(
    title: 'Mulai dari mana saja.',
    subtitle: 'Tidak ada cara yang salah.',
    body: 'Latihan napas. Catatan harian. Cek suasana hati. Atau sekadar hadir — itu sudah cukup.',
    illustrationAsset: 'assets/illustration-orb.svg',
    bgGradientColors: [Color(0x3F9DB287), Color(0x5984A7C1)],
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  void _onPageChanged(int index) => setState(() => _currentPage = index);

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.onboardingShownKey, true);
    if (mounted) context.go(AppRoutes.login);
  }

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    } else {
      _finish();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentPage == _pages.length - 1;

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: _onPageChanged,
            itemCount: _pages.length,
            itemBuilder: (context, i) => _OnboardingPageView(page: _pages[i]),
          ),
          // Bottom controls
          Positioned(
            left: AppSpacing.screenPadding,
            right: AppSpacing.screenPadding,
            bottom: MediaQuery.of(context).padding.bottom + 40,
            child: Column(
              children: [
                // Dot indicators
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_pages.length, (i) {
                    final isActive = i == _currentPage;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOut,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: isActive ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.biru500
                            : AppColors.neutral300,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 28),
                MnButton(
                  label: isLast ? 'Mulai pelan-pelan' : 'Lanjut',
                  onPressed: _next,
                ),
                const SizedBox(height: 10),
                MnButton(
                  label: 'Sudah punya akun',
                  variant: MnButtonVariant.ghost,
                  onPressed: () => context.go(AppRoutes.login),
                ),
              ],
            ),
          ),
          // Skip button
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: AppSpacing.screenPadding,
            child: TextButton(
              onPressed: _finish,
              child: Text(
                'Lewati',
                style: AppTextStyles.label.copyWith(color: AppColors.fg3),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingPageView extends StatelessWidget {
  const _OnboardingPageView({required this.page});

  final _OnboardingPage page;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background radial wash
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0, -0.3),
                radius: 0.85,
                colors: page.bgGradientColors,
              ),
            ),
          ),
        ),
        // Illustration
        Positioned(
          top: MediaQuery.of(context).size.height * 0.12,
          left: 0,
          right: 0,
          child: Center(
            child: SvgPicture.asset(
              page.illustrationAsset,
              width: 220,
              height: 220,
            ),
          ),
        ),
        // Text content
        Positioned(
          left: AppSpacing.screenPadding,
          right: AppSpacing.screenPadding,
          bottom: MediaQuery.of(context).padding.bottom + 220,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RichText(
                text: TextSpan(
                  style: AppTextStyles.displayL.copyWith(height: 1.15),
                  children: [
                    TextSpan(text: page.title),
                    TextSpan(
                      text: '\n${page.subtitle}',
                      style: AppTextStyles.displayLItalic,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                page.body,
                style: AppTextStyles.bodyL.copyWith(
                  color: AppColors.fg3,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
