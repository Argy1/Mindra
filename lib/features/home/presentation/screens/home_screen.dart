import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/providers/accessibility_provider.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_bottom_nav.dart';
import '../../../../shared/widgets/mn_card.dart';
import '../providers/home_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Shell screen — owns bottom nav + SOS FAB
// ─────────────────────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _navIndex = 0;
  static final _navItems = MnBottomNav.defaultItems;

  void _onNavTap(int index) {
    switch (index) {
      case 0:
        setState(() => _navIndex = 0);
      case 1:
        context.go(AppRoutes.assessment);
      case 2:
        context.go(AppRoutes.aiChat);
      case 3:
        context.go(AppRoutes.telemedicine);
      case 4:
        context.go(AppRoutes.profile);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: _navIndex == 0 ? const _HomeBody() : const _PlaceholderBody(),
      bottomNavigationBar: MnBottomNav(
        items: _navItems,
        currentIndex: _navIndex,
        onTap: _onNavTap,
      ),
      // SOS button — coral, not aggressive red
      floatingActionButton: _SosFab(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Home body — all content sections
// ─────────────────────────────────────────────────────────────────────────────

class _HomeBody extends ConsumerWidget {
  const _HomeBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeAsync = ref.watch(homeDataProvider);

    return RefreshIndicator(
      color: AppColors.biru500,
      onRefresh: () => ref.refresh(homeDataProvider.future),
      child: homeAsync.when(
        loading: () => const _HomeLoading(),
        error: (_, __) => const _HomeError(),
        data: (data) => _HomeContent(data: data),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Content — full scrollable layout
// ─────────────────────────────────────────────────────────────────────────────

class _HomeContent extends ConsumerWidget {
  const _HomeContent({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(accessibilityProvider).languageMode;
    final now = DateTime.now();
    final greeting = _greeting(now.hour);
    final dateStr = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(now);

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        // ── 1. Pinned app bar ──────────────────────────────────────
        SliverAppBar(
          pinned: true,
          floating: false,
          backgroundColor: AppColors.surfaceCanvas,
          surfaceTintColor: Colors.transparent,
          scrolledUnderElevation: 1,
          shadowColor: AppColors.neutral900.withValues(alpha: 0.08),
          toolbarHeight: 72,
          titleSpacing: AppSpacing.screenPadding,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$greeting, ${data.name} 👋',
                style: AppTextStyles.h3,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(dateStr, style: AppTextStyles.meta),
            ],
          ),
          actions: [
            // Notification bell
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: const Icon(
                    Icons.notifications_none_rounded,
                    color: AppColors.fg2,
                  ),
                  onPressed: () => context.push(AppRoutes.notificationSettings),
                ),
                if (data.hasUnreadNotifications)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.danger500,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            // Avatar → profile
            GestureDetector(
              onTap: () => context.push(AppRoutes.profile),
              child: Padding(
                padding: const EdgeInsets.only(right: AppSpacing.screenPadding),
                child: _UserAvatar(
                  name: data.name,
                  avatarUrl: data.avatarUrl,
                  size: 36,
                ),
              ),
            ),
          ],
        ),

        // ── 2. Status card ─────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.lg,
              AppSpacing.screenPadding,
              0,
            ),
            child: _StatusCard(data: data, lang: lang),
          ),
        ),

        // ── 3. Quick actions grid ──────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.xl,
              AppSpacing.screenPadding,
              0,
            ),
            child: _QuickActionsGrid(data: data),
          ),
        ),

        // ── 4. Today's insight carousel ────────────────────────────
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenPadding,
                  AppSpacing.xl,
                  AppSpacing.screenPadding,
                  AppSpacing.sm,
                ),
                child: _SectionHeader(
                  title: AppStrings.forYouToday(lang),
                  actionLabel: 'Lihat semua',
                  onAction: () => context.push(AppRoutes.cbt),
                ),
              ),
              _InsightCarousel(data: data),
            ],
          ),
        ),

        // ── 5. Upcoming consultation (conditional) ─────────────────
        if (data.upcomingConsultation != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.xl,
                AppSpacing.screenPadding,
                0,
              ),
              child:
                  _ConsultationCard(consultation: data.upcomingConsultation!),
            ),
          ),

        // ── 6. Weekly mood bars ────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.xl,
              AppSpacing.screenPadding,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionHeader(
                  title: AppStrings.feelings7Days(lang),
                  actionLabel: 'Riwayat lengkap',
                  onAction: () => context.push(AppRoutes.moodHistory),
                ),
                const SizedBox(height: AppSpacing.md),
                _WeeklyMoodBars(points: data.weeklyMood),
              ],
            ),
          ),
        ),

        // ── 7. Weekly insight entry card ───────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.xl,
              AppSpacing.screenPadding,
              0,
            ),
            child: _WeeklyInsightBanner(),
          ),
        ),

        // ── Bottom padding ─────────────────────────────────────────
        SliverToBoxAdapter(
          child: SizedBox(
            height: MediaQuery.of(context).padding.bottom + 96,
          ),
        ),
      ],
    );
  }

  String _greeting(int hour) {
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Status card
// ─────────────────────────────────────────────────────────────────────────────

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.data, required this.lang});

  final HomeDashboardData data;
  final LanguageMode lang;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.biru600, AppColors.biru800],
        ),
        borderRadius: BorderRadius.circular(AppRadius.cardHero),
        boxShadow: [
          BoxShadow(
            color: AppColors.biru800.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: data.hasAssessment
          ? _StatusWithScore(data: data, lang: lang)
          : _StatusCta(onTap: () => context.push(AppRoutes.assessment)),
    );
  }
}

class _StatusWithScore extends StatelessWidget {
  const _StatusWithScore({required this.data, required this.lang});

  final HomeDashboardData data;
  final LanguageMode lang;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Arc gauge
        _HealthArc(score: data.healthScore),
        const SizedBox(width: AppSpacing.xl),
        // Text
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppStrings.conditionThisWeek(lang),
                style: AppTextStyles.overline.copyWith(
                  color: Colors.white.withValues(alpha: 0.7),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                data.healthLabel,
                style: AppTextStyles.h2.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 6),
              Text(
                data.healthInsight,
                style: AppTextStyles.bodyS.copyWith(
                  color: Colors.white.withValues(alpha: 0.75),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              GestureDetector(
                onTap: () => context.push(AppRoutes.assessmentHistory),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Lihat detail',
                      style: AppTextStyles.label.copyWith(
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.white,
                      size: 14,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatusCta extends StatelessWidget {
  const _StatusCta({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Belum ada data kesehatanmu',
          style: AppTextStyles.h3.copyWith(color: Colors.white),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Mulai asesmen pertamamu untuk melihat gambaran kondisi mentalmu.',
          style: AppTextStyles.bodyS
              .copyWith(color: Colors.white.withValues(alpha: 0.75)),
        ),
        const SizedBox(height: AppSpacing.lg),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Text(
              'Mulai Asesmen →',
              style: AppTextStyles.label.copyWith(color: AppColors.biru700),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Semicircular health arc ───────────────────────────────────────────────────

class _HealthArc extends StatelessWidget {
  const _HealthArc({required this.score});

  final int score;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      height: 88,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(88, 88),
            painter: _HealthArcPainter(score: score),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: AppTextStyles.h2.copyWith(color: Colors.white),
              ),
              Text(
                '/100',
                style: AppTextStyles.meta
                    .copyWith(color: Colors.white.withValues(alpha: 0.6)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HealthArcPainter extends CustomPainter {
  const _HealthArcPainter({required this.score});

  final int score;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 7;
    final rect = Rect.fromCircle(center: center, radius: radius);

    // Track
    canvas.drawArc(
      rect,
      -math.pi * 0.8,
      math.pi * 1.6,
      false,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.2)
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );

    // Progress
    final fraction = (score / 100).clamp(0.0, 1.0);
    canvas.drawArc(
      rect,
      -math.pi * 0.8,
      math.pi * 1.6 * fraction,
      false,
      Paint()
        ..color = Colors.white
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(_HealthArcPainter old) => old.score != score;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Quick actions grid
// ─────────────────────────────────────────────────────────────────────────────

class _QuickActionsGrid extends StatelessWidget {
  const _QuickActionsGrid({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final lastAssessment = data.lastAssessmentDaysAgo == null
        ? 'Belum pernah'
        : data.lastAssessmentDaysAgo == 0
            ? 'Hari ini'
            : '${data.lastAssessmentDaysAgo} hari lalu';

    final moodSubtitle = data.hasCheckedInToday
        ? _moodEmoji(data.todayMoodType)
        : 'Belum check-in hari ini';

    final actions = [
      _QuickAction(
        icon: Icons.assignment_outlined,
        label: 'Asesmen',
        subtitle: lastAssessment,
        bgColor: AppColors.biru100,
        iconColor: AppColors.biru700,
        onTap: () => context.push(AppRoutes.assessment),
      ),
      _QuickAction(
        icon: Icons.sentiment_satisfied_alt_outlined,
        label: 'Mood Hari Ini',
        subtitle: moodSubtitle,
        bgColor: AppColors.matahari100,
        iconColor: AppColors.matahari700,
        onTap: () => context.push(AppRoutes.mood),
      ),
      _QuickAction(
        icon: Icons.chat_bubble_outline_rounded,
        label: 'Ngobrol AI',
        subtitle: 'Siap mendengarmu',
        bgColor: AppColors.sage100,
        iconColor: AppColors.sage700,
        onTap: () => context.push(AppRoutes.aiChat),
      ),
      _QuickAction(
        icon: Icons.video_call_outlined,
        label: 'Konsultasi',
        subtitle: 'Temukan psikolog',
        bgColor: const Color(0xFFF0EBF8),
        iconColor: const Color(0xFF6B3FA0),
        onTap: () => context.push(AppRoutes.telemedicine),
      ),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: AppSpacing.sm,
      crossAxisSpacing: AppSpacing.sm,
      childAspectRatio: 1.35,
      children: actions,
    );
  }

  String _moodEmoji(String? moodType) => switch (moodType) {
        'bahagia' => '😊 Bahagia',
        'syukur' => '🙏 Syukur',
        'tenang' => '😌 Tenang',
        'hangat' => '🤗 Hangat',
        'lelah' => '😴 Lelah',
        'cemas' => '😰 Cemas',
        'sedih' => '😢 Sedih',
        _ => '• Sudah check-in',
      };
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.bgColor,
    required this.iconColor,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color bgColor;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: [
            BoxShadow(
              color: AppColors.neutral900.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const Spacer(),
            Text(
              label,
              style: AppTextStyles.bodyM.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.fg1,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: AppTextStyles.meta,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Today's insight carousel
// ─────────────────────────────────────────────────────────────────────────────

class _InsightCarousel extends StatelessWidget {
  const _InsightCarousel({required this.data});

  final HomeDashboardData data;

  static const _quotes = [
    '"Pemulihan bukan garis lurus — itu wajar."',
    '"Setiap hari hadir untuk dirimu sendiri adalah keberanian."',
    '"Pelan-pelan pun tetap melangkah maju."',
    '"Meminta bantuan adalah tanda kekuatan, bukan kelemahan."',
    '"Kamu tidak harus baik-baik saja setiap saat."',
    '"Istirahat juga bagian dari proses."',
    '"Hadir untuk hari ini sudah cukup."',
  ];

  @override
  Widget build(BuildContext context) {
    final quote = _quotes[DateTime.now().weekday % _quotes.length];

    final cards = <Widget>[
      _InsightCard(
        color: AppColors.biru50,
        accentColor: AppColors.biru500,
        icon: Icons.air_rounded,
        title: 'Napas 4-7-8',
        body: '5 menit menenangkan sistem saraf.',
        ctaLabel: 'Mulai',
        onTap: () => context.push('${AppRoutes.cbt}/breathing'),
      ),
      _InsightCard(
        color: AppColors.sage50,
        accentColor: AppColors.sage500,
        icon: Icons.format_quote_rounded,
        title: 'Kutipan Hari Ini',
        body: quote,
        ctaLabel: 'Simpan',
        onTap: () => _saveQuote(context, quote),
      ),
      _InsightCard(
        color: AppColors.matahari50,
        accentColor: AppColors.matahari500,
        icon: Icons.psychology_outlined,
        title: 'Thought Record',
        body: 'Ubah pola pikir yang kurang membantu.',
        ctaLabel: 'Coba',
        onTap: () => context.push('${AppRoutes.cbt}/thought_record'),
      ),
      _InsightCard(
        color: AppColors.hangat100,
        accentColor: AppColors.hangat500,
        icon: Icons.nightlight_round_outlined,
        title: 'Refleksi Malam',
        body: 'Tiga kalimat sebelum tidur.',
        ctaLabel: 'Tulis',
        onTap: () => context.push(AppRoutes.reflection),
      ),
    ];

    return SizedBox(
      height: 148,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
        itemCount: cards.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (_, i) => cards[i],
      ),
    );
  }
}

/// Persists the daily quote to the user's saved-quotes list and confirms.
Future<void> _saveQuote(BuildContext context, String quote) async {
  final messenger = ScaffoldMessenger.of(context);
  final prefs = await SharedPreferences.getInstance();
  final saved = prefs.getStringList('saved_quotes') ?? <String>[];
  final alreadySaved = saved.contains(quote);
  if (!alreadySaved) {
    saved.add(quote);
    await prefs.setStringList('saved_quotes', saved);
  }
  messenger.showSnackBar(
    SnackBar(
      content: Text(
        alreadySaved ? 'Kutipan ini sudah tersimpan 💙' : 'Kutipan disimpan 💙',
      ),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

class _InsightCard extends StatelessWidget {
  const _InsightCard({
    required this.color,
    required this.accentColor,
    required this.icon,
    required this.title,
    required this.body,
    required this.ctaLabel,
    required this.onTap,
  });

  final Color color;
  final Color accentColor;
  final IconData icon;
  final String title;
  final String body;
  final String ctaLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 168,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: accentColor, size: 22),
            const SizedBox(height: AppSpacing.sm),
            Text(
              title,
              style: AppTextStyles.bodyM.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.fg1,
              ),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                body,
                style: AppTextStyles.bodyS.copyWith(height: 1.4),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              ctaLabel,
              style: AppTextStyles.label.copyWith(color: accentColor),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Upcoming consultation card
// ─────────────────────────────────────────────────────────────────────────────

class _ConsultationCard extends StatelessWidget {
  const _ConsultationCard({required this.consultation});

  final UpcomingConsultation consultation;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final diff = consultation.scheduledAt.difference(now);
    final isActive = diff.inMinutes <= 10 && diff.inMinutes >= 0;
    final timeStr = DateFormat('EEEE, d MMM • HH:mm', 'id_ID')
        .format(consultation.scheduledAt);

    return MnCard(
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.biru100,
            backgroundImage: consultation.avatarUrl != null
                ? NetworkImage(consultation.avatarUrl!)
                : null,
            child: consultation.avatarUrl == null
                ? Text(
                    consultation.psychologistName[0],
                    style: AppTextStyles.h3.copyWith(color: AppColors.biru700),
                  )
                : null,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  consultation.psychologistName,
                  style: AppTextStyles.bodyM.copyWith(
                      fontWeight: FontWeight.w600, color: AppColors.fg1),
                ),
                Text(
                  consultation.specialization,
                  style: AppTextStyles.meta,
                ),
                const SizedBox(height: 2),
                Text(timeStr, style: AppTextStyles.bodyS),
              ],
            ),
          ),
          // Join button (active 10 min before)
          if (isActive)
            FilledButton(
              onPressed: () => context.push(AppRoutes.telemedicine),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.sage500,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              child: Text(
                'Bergabung',
                style: AppTextStyles.buttonM.copyWith(fontSize: 12),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.biru50,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: Text(
                diff.inHours > 0
                    ? '${diff.inHours}j lagi'
                    : '${diff.inMinutes}m lagi',
                style: AppTextStyles.label.copyWith(color: AppColors.biru700),
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Weekly mood bar chart
// ─────────────────────────────────────────────────────────────────────────────

class _WeeklyMoodBars extends StatelessWidget {
  const _WeeklyMoodBars({required this.points});

  final List<WeeklyMoodPoint> points;

  static const _barMaxHeight = 52.0;

  Color _barColor(int score) => switch (score) {
        5 => AppColors.sage500,
        4 => AppColors.biru400,
        3 => AppColors.matahari400,
        2 => AppColors.hangat500,
        _ => AppColors.danger300,
      };

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _barMaxHeight + 22,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: points.map((p) {
          final frac = p.score != null ? p.score! / 5.0 : 0.0;
          final barH = p.score != null
              ? (_barMaxHeight * frac).clamp(6.0, _barMaxHeight)
              : 4.0;
          final color =
              p.score != null ? _barColor(p.score!) : AppColors.neutral200;
          final isToday = p.date.day == DateTime.now().day &&
              p.date.month == DateTime.now().month;

          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: _barMaxHeight,
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeOut,
                        height: barH,
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(4),
                          border: isToday
                              ? Border.all(
                                  color: AppColors.biru500,
                                  width: 1.5,
                                )
                              : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.dayLabel,
                    style: AppTextStyles.meta.copyWith(
                      color: isToday ? AppColors.biru600 : AppColors.fg4,
                      fontWeight: isToday ? FontWeight.w700 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Weekly insight entry banner
// ─────────────────────────────────────────────────────────────────────────────

class _WeeklyInsightBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(AppRoutes.weeklyInsight),
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.biru50,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: Border.all(color: AppColors.biru100),
        ),
        child: Row(
          children: [
            const Text('📊', style: TextStyle(fontSize: 24)),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Laporan Minggu Ini',
                    style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.fg1, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    'Lihat ringkasan mood, tidur, dan aktivitasmu',
                    style: AppTextStyles.meta.copyWith(color: AppColors.fg3),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.biru500, size: 20),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOS FAB
// ─────────────────────────────────────────────────────────────────────────────

class _SosFab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => context.push(AppRoutes.crisis),
      backgroundColor: AppColors.hangat300,
      foregroundColor: AppColors.hangat700,
      elevation: 2,
      label: Text(
        'Bantuan',
        style: AppTextStyles.label.copyWith(color: AppColors.hangat700),
      ),
      icon: const Icon(Icons.favorite_rounded, size: 18),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-widgets
// ─────────────────────────────────────────────────────────────────────────────

class _UserAvatar extends StatelessWidget {
  const _UserAvatar({required this.name, this.avatarUrl, this.size = 36});

  final String name;
  final String? avatarUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: AppColors.biru100,
      backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl!) : null,
      child: avatarUrl == null
          ? Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: AppTextStyles.h4.copyWith(color: AppColors.biru700),
            )
          : null,
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: AppTextStyles.h3),
        ),
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          ),
          child: Text(
            actionLabel,
            style: AppTextStyles.label.copyWith(color: AppColors.biru600),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading & error states
// ─────────────────────────────────────────────────────────────────────────────

class _HomeLoading extends StatelessWidget {
  const _HomeLoading();

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          toolbarHeight: 72,
          backgroundColor: AppColors.surfaceCanvas,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _Shimmer(width: 180, height: 20),
              const SizedBox(height: 4),
              _Shimmer(width: 120, height: 12),
            ],
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _Shimmer(
                  width: double.infinity,
                  height: 140,
                  radius: AppRadius.cardHero),
              const SizedBox(height: AppSpacing.xl),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.sm,
                crossAxisSpacing: AppSpacing.sm,
                childAspectRatio: 1.35,
                children: List.generate(
                  4,
                  (_) => _Shimmer(
                      width: double.infinity,
                      height: double.infinity,
                      radius: AppRadius.card),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _Shimmer extends StatelessWidget {
  const _Shimmer({required this.width, required this.height, this.radius = 8});

  final double width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.neutral100,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _HomeError extends StatelessWidget {
  const _HomeError();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded,
                size: 48, color: AppColors.neutral300),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Tidak bisa memuat data.',
              style: AppTextStyles.bodyM,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Tarik ke bawah untuk coba lagi.',
              style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder for non-home nav tabs
// ─────────────────────────────────────────────────────────────────────────────

class _PlaceholderBody extends StatelessWidget {
  const _PlaceholderBody();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        'Segera hadir',
        style: AppTextStyles.bodyL.copyWith(color: AppColors.fg4),
      ),
    );
  }
}
