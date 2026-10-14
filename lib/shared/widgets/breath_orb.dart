import 'package:flutter/material.dart';
/// Mindra breath orb — animates between inhale and exhale.
/// Respects reduced-motion media query by falling back to a static orb.
class BreathOrb extends StatefulWidget {
  const BreathOrb({
    super.key,
    this.size = 220,
    this.inhaleSeconds = 4,
    this.holdSeconds = 7,
    this.exhaleSeconds = 8,
    this.onPhaseChange,
  });

  final double size;
  final int inhaleSeconds;
  final int holdSeconds;
  final int exhaleSeconds;
  final ValueChanged<BreathPhase>? onPhaseChange;

  @override
  State<BreathOrb> createState() => _BreathOrbState();
}

enum BreathPhase { inhale, hold, exhale }

class _BreathOrbState extends State<BreathOrb>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  BreathPhase _phase = BreathPhase.inhale;
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: widget.inhaleSeconds),
    )..addStatusListener(_onStatus);
  }

  void _onStatus(AnimationStatus status) {
    if (!_isPlaying) return;
    if (status == AnimationStatus.completed) {
      _nextPhase();
    }
  }

  void _nextPhase() {
    final next = switch (_phase) {
      BreathPhase.inhale => BreathPhase.hold,
      BreathPhase.hold   => BreathPhase.exhale,
      BreathPhase.exhale => BreathPhase.inhale,
    };
    setState(() => _phase = next);
    widget.onPhaseChange?.call(next);
    _controller.duration = switch (next) {
      BreathPhase.inhale => Duration(seconds: widget.inhaleSeconds),
      BreathPhase.hold   => Duration(seconds: widget.holdSeconds),
      BreathPhase.exhale => Duration(seconds: widget.exhaleSeconds),
    };
    _controller
      ..reset()
      ..forward();
  }

  void togglePlay() {
    setState(() => _isPlaying = !_isPlaying);
    if (_isPlaying) {
      _controller.forward();
    } else {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _phaseLabel => switch (_phase) {
        BreathPhase.inhale => 'Tarik napas',
        BreathPhase.hold   => 'Tahan',
        BreathPhase.exhale => 'Hembuskan',
      };

  @override
  Widget build(BuildContext context) {
    final reducedMotion =
        MediaQuery.of(context).disableAnimations;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final scale = reducedMotion
            ? 1.0
            : switch (_phase) {
                BreathPhase.inhale =>
                  Tween<double>(begin: 0.84, end: 1.0).evaluate(_controller),
                BreathPhase.hold   => 1.0,
                BreathPhase.exhale =>
                  Tween<double>(begin: 1.0, end: 0.84).evaluate(_controller),
              };

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _phaseLabel.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.65),
                    letterSpacing: 1.5,
                  ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: togglePlay,
              child: Transform.scale(
                scale: scale,
                child: _OrbWidget(size: widget.size, controller: _controller),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _OrbWidget extends StatelessWidget {
  const _OrbWidget({required this.size, required this.controller});

  final double size;
  final AnimationController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(
          center: Alignment(-0.25, -0.35),
          radius: 1.0,
          colors: [
            Color(0xFFD6E2EC),
            Color(0xFF84A7C1),
            Color(0xFF437094),
          ],
          stops: [0.0, 0.55, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF437094).withValues(alpha: 0.30),
            blurRadius: 60,
            offset: const Offset(0, 20),
          ),
          BoxShadow(
            color: const Color(0xFF84A7C1).withValues(alpha: 0.14),
            blurRadius: 0,
            spreadRadius: 22,
          ),
          BoxShadow(
            color: const Color(0xFF84A7C1).withValues(alpha: 0.08),
            blurRadius: 0,
            spreadRadius: 44,
          ),
        ],
      ),
    );
  }
}
