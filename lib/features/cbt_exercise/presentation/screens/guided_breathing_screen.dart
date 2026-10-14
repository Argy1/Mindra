import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/exercise_entity.dart';
import '../providers/exercise_provider.dart';

// 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s — 4 rounds
// Clinically validated for acute anxiety reduction (Dr. Andrew Weil, Harvard)

enum _BreathPhase { idle, inhale, hold, exhale, done }

class GuidedBreathingScreen extends ConsumerStatefulWidget {
  const GuidedBreathingScreen({super.key});

  @override
  ConsumerState<GuidedBreathingScreen> createState() =>
      _GuidedBreathingScreenState();
}

class _GuidedBreathingScreenState extends ConsumerState<GuidedBreathingScreen>
    with TickerProviderStateMixin {
  late AnimationController _circleCtrl;
  late AnimationController _pulseCtrl;

  _BreathPhase _phase = _BreathPhase.idle;
  int _round = 0;
  static const _totalRounds = 4;
  static const _inhaleDur = 4;
  static const _holdDur = 7;
  static const _exhaleDur = 8;

  int _countdown = _inhaleDur;

  @override
  void initState() {
    super.initState();
    _circleCtrl = AnimationController(vsync: this);
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _circleCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  void _start() {
    setState(() { _round = 0; _phase = _BreathPhase.inhale; });
    _runInhale();
  }

  void _runInhale() {
    _countdown = _inhaleDur;
    setState(() => _phase = _BreathPhase.inhale);
    _circleCtrl.duration = const Duration(seconds: _inhaleDur);
    _circleCtrl.animateTo(1.0).then((_) {
      if (mounted) _runHold();
    });
    _tickCountdown(_inhaleDur, () {});
  }

  void _runHold() {
    _countdown = _holdDur;
    setState(() => _phase = _BreathPhase.hold);
    _circleCtrl.stop();
    _tickCountdown(_holdDur, () { if (mounted) _runExhale(); });
  }

  void _runExhale() {
    _countdown = _exhaleDur;
    setState(() => _phase = _BreathPhase.exhale);
    _circleCtrl.duration = const Duration(seconds: _exhaleDur);
    _circleCtrl.animateTo(0.0).then((_) {
      if (!mounted) return;
      final nextRound = _round + 1;
      if (nextRound >= _totalRounds) {
        _complete();
      } else {
        setState(() => _round = nextRound);
        _runInhale();
      }
    });
    _tickCountdown(_exhaleDur, () {});
  }

  void _complete() {
    setState(() => _phase = _BreathPhase.done);
    _circleCtrl.stop();
    final user = ref.read(currentUserProvider);
    if (user != null) {
      ref.read(streakProvider.notifier)
          .markComplete(user.id, CbtExerciseType.guidedBreathing);
    }
  }

  void _tickCountdown(int seconds, VoidCallback onDone) {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _countdown = (_countdown - 1).clamp(0, seconds));
      if (_countdown <= 0) { onDone(); return false; }
      return true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      body: SafeArea(
        child: _phase == _BreathPhase.done
            ? _DoneView(onBack: () => context.pop())
            : _SessionView(
                phase: _phase,
                round: _round,
                countdown: _countdown,
                circleCtrl: _circleCtrl,
                pulseCtrl: _pulseCtrl,
                onStart: _start,
                onBack: () => context.pop(),
              ),
      ),
    );
  }
}

class _SessionView extends StatelessWidget {
  const _SessionView({
    required this.phase,
    required this.round,
    required this.countdown,
    required this.circleCtrl,
    required this.pulseCtrl,
    required this.onStart,
    required this.onBack,
  });

  final _BreathPhase phase;
  final int round, countdown;
  final AnimationController circleCtrl, pulseCtrl;
  final VoidCallback onStart, onBack;

  bool get _isIdle => phase == _BreathPhase.idle;

  String get _phaseText => switch (phase) {
        _BreathPhase.idle => 'Siap?',
        _BreathPhase.inhale => 'Hirup',
        _BreathPhase.hold => 'Tahan',
        _BreathPhase.exhale => 'Hembuskan',
        _ => '',
      };

  String get _instructionText => switch (phase) {
        _BreathPhase.idle =>
          'Teknik 4-7-8 menenangkan sistem saraf dalam hitungan menit.\n\nDuduk tegak. Tutup mata. Letakkan ujung lidah di belakang gigi atas.',
        _BreathPhase.inhale =>
          'Hirup perlahan melalui hidung\nselama 4 detik.',
        _BreathPhase.hold =>
          'Tahan napasmu.\nBiarkan oksigen menyebar ke seluruh tubuh.',
        _BreathPhase.exhale =>
          'Hembuskan sepenuhnya melalui mulut\nselama 8 detik.',
        _ => '',
      };

  Color get _phaseColor => switch (phase) {
        _BreathPhase.inhale => const Color(0xFF2E6DA4),
        _BreathPhase.hold => const Color(0xFF7B68EE),
        _BreathPhase.exhale => const Color(0xFF4A9E8F),
        _ => const Color(0xFF7B68EE),
      };

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Top bar
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white38),
                onPressed: onBack,
              ),
              const Spacer(),
              if (!_isIdle)
                Text(
                  'Putaran ${round + 1} dari 4',
                  style: const TextStyle(color: Colors.white54, fontSize: 14),
                ),
              const Spacer(),
              const SizedBox(width: 48),
            ],
          ),
        ),

        // Round dots
        if (!_isIdle)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (i) => Container(
                width: i == round ? 24 : 8,
                height: 8,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: i < round
                      ? const Color(0xFF4A9E8F)
                      : i == round
                          ? Colors.white
                          : Colors.white12,
                  borderRadius: BorderRadius.circular(4),
                ),
              )),
            ),
          ),

        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Animated breathing circle
              AnimatedBuilder(
                animation: Listenable.merge([circleCtrl, pulseCtrl]),
                builder: (_, __) {
                  final expansion = circleCtrl.value;
                  final pulse = _isIdle ? pulseCtrl.value : 0.0;

                  return SizedBox(
                    width: 260,
                    height: 260,
                    child: CustomPaint(
                      painter: _BreathPainter(
                        expansion: expansion,
                        pulse: pulse,
                        color: _phaseColor,
                        isIdle: _isIdle,
                      ),
                      child: Center(
                        child: _isIdle
                            ? const Icon(Icons.air, color: Colors.white54, size: 48)
                            : Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '$countdown',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 52,
                                      fontWeight: FontWeight.w700,
                                      height: 1,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'detik',
                                    style: TextStyle(
                                        color: Colors.white54, fontSize: 14),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 32),

              // Phase label
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: Text(
                  _phaseText,
                  key: ValueKey(phase),
                  style: TextStyle(
                    color: _isIdle ? Colors.white54 : _phaseColor,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  child: Text(
                    _instructionText,
                    key: ValueKey(phase),
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 14,
                      height: 1.7,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),

              // 4-7-8 reference chips
              if (_isIdle) ...[
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _DurChip(label: 'Hirup', seconds: '4s', color: const Color(0xFF2E6DA4)),
                    const SizedBox(width: 8),
                    _DurChip(label: 'Tahan', seconds: '7s', color: const Color(0xFF7B68EE)),
                    const SizedBox(width: 8),
                    _DurChip(label: 'Hembus', seconds: '8s', color: const Color(0xFF4A9E8F)),
                  ],
                ),
              ],
            ],
          ),
        ),

        // Bottom button
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: _isIdle
              ? SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onStart,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF7B68EE),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Mulai',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}

class _BreathPainter extends CustomPainter {
  const _BreathPainter({
    required this.expansion,
    required this.pulse,
    required this.color,
    required this.isIdle,
  });

  final double expansion, pulse;
  final Color color;
  final bool isIdle;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;

    // Outer glow rings
    for (var i = 3; i >= 1; i--) {
      final r = (0.45 + expansion * 0.4 + pulse * 0.03) * maxR + i * 12.0;
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..color = color.withValues(alpha: 0.04 * i)
          ..style = PaintingStyle.fill,
      );
    }

    // Main circle
    final mainR = (0.4 + expansion * 0.42 + pulse * 0.03) * maxR;
    canvas.drawCircle(
      center,
      mainR,
      Paint()
        ..color = color.withValues(alpha: isIdle ? 0.15 : 0.2)
        ..style = PaintingStyle.fill,
    );

    // Border
    canvas.drawCircle(
      center,
      mainR,
      Paint()
        ..color = color.withValues(alpha: isIdle ? 0.4 : 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );

    // Tick marks around the border (19-second cycle reference)
    if (!isIdle) {
      final tickPaint = Paint()
        ..color = color.withValues(alpha: 0.3)
        ..strokeWidth = 1.5;
      for (var i = 0; i < 19; i++) {
        final angle = (i / 19) * 2 * math.pi - math.pi / 2;
        final inner = mainR - 8;
        final outer = mainR - 2;
        canvas.drawLine(
          center + Offset(math.cos(angle) * inner, math.sin(angle) * inner),
          center + Offset(math.cos(angle) * outer, math.sin(angle) * outer),
          tickPaint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_BreathPainter old) =>
      old.expansion != expansion || old.pulse != pulse || old.color != color;
}

class _DurChip extends StatelessWidget {
  const _DurChip(
      {required this.label, required this.seconds, required this.color});
  final String label, seconds;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Column(
          children: [
            Text(seconds,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 14)),
            Text(label,
                style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ],
        ),
      );
}

class _DoneView extends StatelessWidget {
  const _DoneView({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('🫧',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 72)),
          const SizedBox(height: 24),
          Text(
            'Selesai! 4 Putaran Napas',
            style: AppTextStyles.h2.copyWith(color: Colors.white),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Sistem sarafmu telah ditenangkan. Efek relaksasi akan terasa dalam beberapa menit ke depan.\n\nLakukan ini kapan saja kamu merasa cemas.',
            style: TextStyle(
                color: Colors.white60, fontSize: 15, height: 1.7),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          FilledButton(
            onPressed: onBack,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF7B68EE),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('Selesai',
                style:
                    TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
