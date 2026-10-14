import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Mindra's avatar — a gradient orb that gently scales like a breath.
///
/// When [active] is true (e.g. the AI is streaming), the breath is faster
/// and a soft outer halo pulses with it.
class BreathingAvatar extends StatefulWidget {
  const BreathingAvatar({
    super.key,
    this.size = 32,
    this.active = false,
  });

  final double size;
  final bool active;

  @override
  State<BreathingAvatar> createState() => _BreathingAvatarState();
}

class _BreathingAvatarState extends State<BreathingAvatar>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _curve;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: _durationFor(widget.active),
    )..repeat(reverse: true);
    _curve = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void didUpdateWidget(covariant BreathingAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      _ctrl.duration = _durationFor(widget.active);
      _ctrl
        ..stop()
        ..repeat(reverse: true);
    }
  }

  Duration _durationFor(bool active) =>
      active ? const Duration(milliseconds: 1100) : const Duration(seconds: 3);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      builder: (_, __) {
        final t = _curve.value;
        final scale = 1.0 + (widget.active ? 0.10 : 0.05) * t;
        final haloOpacity = (widget.active ? 0.45 : 0.25) * t;

        return SizedBox(
          width: widget.size * 1.4,
          height: widget.size * 1.4,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer halo
              Container(
                width: widget.size * (1.15 + 0.18 * t),
                height: widget.size * (1.15 + 0.18 * t),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.sage300.withValues(alpha: haloOpacity),
                ),
              ),
              // Avatar core
              Transform.scale(
                scale: scale,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.biru400, AppColors.sage500],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      'M',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: widget.size * 0.45,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
