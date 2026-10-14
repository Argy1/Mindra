import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/widgets/mn_button.dart';
import '../providers/sleep_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — loads today's entry and hands off
// ─────────────────────────────────────────────────────────────────────────────

class SleepTrackerScreen extends ConsumerWidget {
  const SleepTrackerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todayAsync = ref.watch(todaysSleepProvider);
    return todayAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => _SleepErrorScaffold(message: errorMessage(e)),
      data: (_) => const _SleepCheckinScaffold(),
    );
  }
}

class _SleepErrorScaffold extends StatelessWidget {
  const _SleepErrorScaffold({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Text(
            message,
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main checkin scaffold
// ─────────────────────────────────────────────────────────────────────────────

class _SleepCheckinScaffold extends ConsumerStatefulWidget {
  const _SleepCheckinScaffold();

  @override
  ConsumerState<_SleepCheckinScaffold> createState() =>
      _SleepCheckinScaffoldState();
}

class _SleepCheckinScaffoldState extends ConsumerState<_SleepCheckinScaffold> {
  final _noteController = TextEditingController();
  bool _initialized = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _maybeInit() {
    if (_initialized) return;
    _initialized = true;
    final todayEntry = ref.read(todaysSleepProvider).valueOrNull;
    if (todayEntry != null) {
      _noteController.text = todayEntry.notes;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref.read(sleepCheckinProvider.notifier).initFromEntry(todayEntry);
        }
      });
    }
  }

  Future<void> _pickTime({required bool isBedtime}) async {
    final notifier = ref.read(sleepCheckinProvider.notifier);
    final state = ref.read(sleepCheckinProvider);
    final initial = isBedtime
        ? (state.bedtime ?? const TimeOfDay(hour: 22, minute: 30))
        : (state.wakeTime ?? const TimeOfDay(hour: 6, minute: 30));

    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    if (isBedtime) {
      notifier.setBedtime(picked);
    } else {
      notifier.setWakeTime(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    _maybeInit();

    final state = ref.watch(sleepCheckinProvider);
    final notifier = ref.read(sleepCheckinProvider.notifier);
    final userId = ref.read(supabaseProvider).auth.currentUser?.id ?? '';

    ref.listen<SleepCheckinState>(sleepCheckinProvider, (prev, next) {
      if (next.saved && !(prev?.saved ?? false)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'Tidur berhasil dicatat!',
                  style: AppTextStyles.bodyM
                      .copyWith(color: Colors.white, height: 1),
                ),
              ],
            ),
            backgroundColor: AppColors.sage500,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
          ),
        );
        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) context.pop();
        });
      }
      if (next.error != null && prev?.error != next.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.danger500,
          ),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: AppColors.fg1,
          onPressed: () => context.pop(),
        ),
        title: Text(
          state.isEditMode ? 'Edit Catatan Tidur' : 'Lacak Tidur',
          style: AppTextStyles.h3,
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () => context.push('/home/sleep/history'),
            child: Text(
              'Riwayat',
              style: AppTextStyles.label.copyWith(color: AppColors.biru500),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Illustration ─────────────────────────────────────────
            const _MoonIllustration(),
            const SizedBox(height: AppSpacing.xl),

            // ── Header ───────────────────────────────────────────────
            Text(
              'Bagaimana tidurmu\nsemalam?',
              style: AppTextStyles.displayM,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(DateTime.now()),
              style: AppTextStyles.bodyM,
            ),
            const SizedBox(height: AppSpacing.xxl),

            // ── Time pickers ─────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: _TimeCard(
                    label: 'Jam Tidur',
                    hint: '22:30',
                    time: state.bedtime,
                    onTap: () => _pickTime(isBedtime: true),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _TimeCard(
                    label: 'Jam Bangun',
                    hint: '06:30',
                    time: state.wakeTime,
                    onTap: () => _pickTime(isBedtime: false),
                  ),
                ),
              ],
            ),

            // ── Duration badge ───────────────────────────────────────
            if (state.duration != null) ...[
              const SizedBox(height: AppSpacing.md),
              _DurationBadge(duration: state.duration!),
            ],

            const SizedBox(height: AppSpacing.xxl),

            // ── Quality ──────────────────────────────────────────────
            Text('Kualitas Tidur', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.sm),
            _QualitySelector(
              quality: state.quality,
              onSelect: notifier.setQuality,
            ),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: Text(
                _qualityLabel(state.quality),
                style: AppTextStyles.bodyM.copyWith(
                    color: AppColors.fg2, fontWeight: FontWeight.w500),
              ),
            ),

            const SizedBox(height: AppSpacing.xxl),

            // ── Note ─────────────────────────────────────────────────
            Text('Catatan (opsional)', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.sm),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.borderSoft),
              ),
              child: TextField(
                controller: _noteController,
                maxLines: 3,
                maxLength: 300,
                onChanged: notifier.setNotes,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
                decoration: InputDecoration(
                  hintText: 'Mimpi, gangguan tidur, atau catatan lain…',
                  hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(AppSpacing.md),
                  counterStyle: AppTextStyles.meta,
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.xxl),

            MnButton(
              label: state.isEditMode ? 'Perbarui Catatan' : 'Simpan Tidur',
              onPressed: state.canSave && !state.isSaving
                  ? () => notifier.save(userId)
                  : null,
              isLoading: state.isSaving,
            ),

            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }

  String _qualityLabel(int q) => switch (q) {
        1 => 'Sangat Buruk — tidur tidak nyenyak sama sekali',
        2 => 'Buruk — banyak terbangun atau gelisah',
        3 => 'Cukup — tidur tapi kurang segar',
        4 => 'Baik — tidur cukup nyenyak',
        _ => 'Sangat Nyenyak — tidur sempurna!',
      };
}

// ─────────────────────────────────────────────────────────────────────────────
// Moon illustration — custom painted crescent with floating animation
// ─────────────────────────────────────────────────────────────────────────────

class _MoonIllustration extends StatefulWidget {
  const _MoonIllustration();

  @override
  State<_MoonIllustration> createState() => _MoonIllustrationState();
}

class _MoonIllustrationState extends State<_MoonIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _float;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);
    _float = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: Container(
        width: double.infinity,
        height: 152,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D1B3E), Color(0xFF162C70)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // Stars
            ..._starData.map(
              (s) => Positioned(
                left: s.x,
                top: s.y,
                child: _StarDot(size: s.size, delay: s.delay),
              ),
            ),

            // Floating crescent moon
            Center(
              child: AnimatedBuilder(
                animation: _float,
                builder: (_, child) => Transform.translate(
                  offset: Offset(0, _float.value * -7),
                  child: child,
                ),
                child: CustomPaint(
                  size: const Size(88, 88),
                  painter: _CrescentPainter(),
                ),
              ),
            ),

            // Caption
            Positioned(
              bottom: 12,
              left: 16,
              right: 16,
              child: Text(
                'Tidur berkualitas membangun hari yang lebih baik',
                textAlign: TextAlign.center,
                style: AppTextStyles.meta.copyWith(
                  color: Colors.white.withValues(alpha: 0.55),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StarData {
  const _StarData(this.x, this.y, this.size, this.delay);
  final double x, y, size;
  final int delay;
}

const _starData = [
  _StarData(22, 14, 2.5, 0),
  _StarData(58, 30, 1.5, 200),
  _StarData(38, 8, 2.0, 400),
  _StarData(195, 18, 3.0, 100),
  _StarData(235, 42, 1.5, 600),
  _StarData(270, 14, 2.0, 300),
  _StarData(110, 120, 1.5, 500),
  _StarData(260, 100, 2.0, 700),
  _StarData(150, 22, 1.0, 250),
  _StarData(300, 60, 1.5, 450),
];

class _StarDot extends StatelessWidget {
  const _StarDot({required this.size, required this.delay});
  final double size;
  final int delay;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.5),
            blurRadius: 3,
          ),
        ],
      ),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .fadeIn(
          duration: 1500.ms,
          delay: Duration(milliseconds: delay),
          curve: Curves.easeInOut,
        )
        .then()
        .fadeOut(duration: 1500.ms, curve: Curves.easeInOut);
  }
}

class _CrescentPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width * 0.40;

    // Glow behind moon
    canvas.drawCircle(
      Offset(cx, cy),
      r + 6,
      Paint()
        ..color = const Color(0xFFFFE08A).withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10),
    );

    // Crescent = full circle minus offset shadow circle
    final moonPath = Path()
      ..addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));
    final shadowPath = Path()
      ..addOval(Rect.fromCircle(
        center: Offset(cx - r * 0.30, cy - r * 0.05),
        radius: r * 0.84,
      ));
    final crescent = Path.combine(
      PathOperation.difference,
      moonPath,
      shadowPath,
    );

    canvas.drawPath(
      crescent,
      Paint()
        ..color = const Color(0xFFFFE08A)
        ..style = PaintingStyle.fill,
    );

    // Subtle highlight arc on crescent tip
    canvas.drawArc(
      Rect.fromCircle(
          center: Offset(cx + r * 0.18, cy - r * 0.12), radius: r * 0.22),
      math.pi * 0.8,
      math.pi * 0.6,
      false,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_CrescentPainter _) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time card — tappable to open time picker
// ─────────────────────────────────────────────────────────────────────────────

class _TimeCard extends StatelessWidget {
  const _TimeCard({
    required this.label,
    required this.hint,
    required this.time,
    required this.onTap,
  });

  final String label;
  final String hint;
  final TimeOfDay? time;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasTime = time != null;
    final timeStr = hasTime
        ? '${time!.hour.toString().padLeft(2, '0')}:${time!.minute.toString().padLeft(2, '0')}'
        : '--:--';

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(
          vertical: AppSpacing.md,
          horizontal: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: Border.all(
            color: hasTime ? AppColors.biru300 : AppColors.borderSoft,
            width: hasTime ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AppTextStyles.overline,
            ),
            const SizedBox(height: 6),
            Text(
              timeStr,
              style: AppTextStyles.displayM.copyWith(
                color: hasTime ? AppColors.biru600 : AppColors.neutral300,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.access_time_rounded,
                    size: 11, color: AppColors.fg4),
                const SizedBox(width: 3),
                Text('ketuk untuk ubah', style: AppTextStyles.meta),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration badge — animated color based on hours
// ─────────────────────────────────────────────────────────────────────────────

class _DurationBadge extends StatelessWidget {
  const _DurationBadge({required this.duration});
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final color = durationColor(duration);
    final label = formatDuration(duration);

    return Center(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.bedtime_rounded, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              'Durasi: $label',
              style: AppTextStyles.label.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 200.ms).scale(
            begin: const Offset(0.9, 0.9),
            end: const Offset(1.0, 1.0),
            duration: 200.ms,
          ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality selector — 5 moon phase emojis
// ─────────────────────────────────────────────────────────────────────────────

class _QualitySelector extends StatelessWidget {
  const _QualitySelector({required this.quality, required this.onSelect});

  final int quality;
  final ValueChanged<int> onSelect;

  static const _phases = ['🌑', '🌒', '🌓', '🌔', '🌕'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(5, (i) {
        final value = i + 1;
        final isSelected = quality == value;
        return GestureDetector(
          onTap: () => onSelect(value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: isSelected ? AppColors.biru50 : AppColors.surfaceRaised,
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected ? AppColors.biru400 : AppColors.borderSoft,
                width: isSelected ? 2.0 : 1.0,
              ),
            ),
            child: Center(
              child: Text(
                _phases[i],
                style: TextStyle(fontSize: isSelected ? 26 : 22),
              )
                  .animate(
                    key: ValueKey(isSelected ? 'q${value}on' : 'q${value}off'),
                  )
                  .scale(
                    begin: isSelected
                        ? const Offset(0.6, 0.6)
                        : const Offset(1.0, 1.0),
                    end: const Offset(1.0, 1.0),
                    duration: 350.ms,
                    curve: Curves.elasticOut,
                  ),
            ),
          ),
        );
      }),
    );
  }
}
