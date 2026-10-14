import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

enum _BreathPhase { inhale, hold, exhale }

/// 4-7-8 breathing exercise — inhale 4s, hold 7s, exhale 8s.
class BreathingExerciseScreen extends StatefulWidget {
  const BreathingExerciseScreen({super.key});

  @override
  State<BreathingExerciseScreen> createState() =>
      _BreathingExerciseScreenState();
}

class _BreathingExerciseScreenState extends State<BreathingExerciseScreen>
    with SingleTickerProviderStateMixin {
  static const _inhaleSec = 4;
  static const _holdSec = 7;
  static const _exhaleSec = 8;
  static const _totalSec = _inhaleSec + _holdSec + _exhaleSec; // 19
  static const _minCycles = 4;

  late AnimationController _ctrl;
  late Animation<double> _scale;
  _BreathPhase _phase = _BreathPhase.inhale;
  int _cycleCount = 0;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: _totalSec),
    );

    _scale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.5, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: _inhaleSec.toDouble(),
      ),
      TweenSequenceItem(
        tween: ConstantTween(1.0),
        weight: _holdSec.toDouble(),
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.5)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: _exhaleSec.toDouble(),
      ),
    ]).animate(_ctrl);

    _ctrl.addListener(_onTick);
    _ctrl.addStatusListener(_onStatus);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.removeListener(_onTick);
    _ctrl.removeStatusListener(_onStatus);
    _ctrl.dispose();
    super.dispose();
  }

  void _onTick() {
    final t = _ctrl.value * _totalSec;
    final newPhase = t < _inhaleSec
        ? _BreathPhase.inhale
        : t < _inhaleSec + _holdSec
            ? _BreathPhase.hold
            : _BreathPhase.exhale;
    if (newPhase != _phase) {
      setState(() => _phase = newPhase);
    }
  }

  void _onStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      setState(() {
        _cycleCount++;
        _phase = _BreathPhase.inhale;
      });
      _ctrl
        ..reset()
        ..forward();
    }
  }

  Color get _phaseColor => switch (_phase) {
        _BreathPhase.inhale => AppColors.biru400,
        _BreathPhase.hold => const Color(0xFF8B7DCB), // soft purple
        _BreathPhase.exhale => AppColors.sage500,
      };

  String get _phaseLabel => switch (_phase) {
        _BreathPhase.inhale => 'Tarik napas...',
        _BreathPhase.hold => 'Tahan...',
        _BreathPhase.exhale => 'Hembuskan perlahan...',
      };

  int get _phaseCountdown {
    final t = _ctrl.value * _totalSec;
    return switch (_phase) {
      _BreathPhase.inhale => (_inhaleSec - t).ceil().clamp(1, _inhaleSec),
      _BreathPhase.hold =>
        (_inhaleSec + _holdSec - t).ceil().clamp(1, _holdSec),
      _BreathPhase.exhale => (_totalSec - t).ceil().clamp(1, _exhaleSec),
    };
  }

  void _confirmExit() {
    if (_cycleCount >= _minCycles) {
      context.pop();
      return;
    }
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        title: Text('Akhiri latihan?', style: AppTextStyles.h3),
        content: Text(
          'Coba selesaikan minimal $_minCycles siklus untuk merasakan '
          'efek tenangnya. Kamu baru di siklus ke-${_cycleCount + 1}.',
          style:
              AppTextStyles.bodyM.copyWith(color: AppColors.fg2, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Lanjut Bernapas',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.biru500)),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.pop();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.neutral200,
              foregroundColor: AppColors.fg2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 22),
          color: AppColors.fg2,
          onPressed: _confirmExit,
        ),
        title: Text('Pernapasan 4-7-8', style: AppTextStyles.h4),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.biru50,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  'Siklus ${_cycleCount + 1}',
                  style: AppTextStyles.meta.copyWith(
                    color: AppColors.biru600,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            children: [
              const Spacer(),

              // Animated circle
              AnimatedBuilder(
                animation: _ctrl,
                builder: (_, __) {
                  final scale = _scale.value;
                  final color = _phaseColor;
                  return SizedBox(
                    width: 280,
                    height: 280,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Outer glow
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          width: 260 * scale,
                          height: 260 * scale,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: color.withValues(alpha: 0.1),
                          ),
                        ),
                        // Middle ring
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          width: 220 * scale,
                          height: 220 * scale,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: color.withValues(alpha: 0.2),
                          ),
                        ),
                        // Core
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          width: 180 * scale,
                          height: 180 * scale,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                color.withValues(alpha: 0.95),
                                color.withValues(alpha: 0.7),
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: color.withValues(alpha: 0.4),
                                blurRadius: 32,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              '$_phaseCountdown',
                              style: AppTextStyles.displayXL.copyWith(
                                color: Colors.white,
                                fontSize: 56,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),

              // Phase label
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: Text(
                  _phaseLabel,
                  key: ValueKey(_phase),
                  style: AppTextStyles.h2.copyWith(
                    color: _phaseColor,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Tarik napas 4 detik • Tahan 7 detik • Hembuskan 8 detik',
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                textAlign: TextAlign.center,
              ),
              const Spacer(),

              // Min-cycles progress
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_minCycles, (i) {
                  final done = i < _cycleCount;
                  return Container(
                    width: 28,
                    height: 4,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: done ? AppColors.success500 : AppColors.neutral200,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  );
                }),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                _cycleCount >= _minCycles
                    ? 'Kamu sudah selesai. Lanjutkan jika ingin.'
                    : '${_minCycles - _cycleCount} siklus lagi untuk efek penuh',
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Exit button
              OutlinedButton(
                onPressed: _confirmExit,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: BorderSide(color: AppColors.borderMedium),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
                child: Text(
                  _cycleCount >= _minCycles ? 'Selesai' : 'Akhiri',
                  style: AppTextStyles.buttonM.copyWith(color: AppColors.fg2),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }
}
