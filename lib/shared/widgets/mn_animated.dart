import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/accessibility_provider.dart';

/// Fade-in + slide-up card animation that respects the "Reduce Motion" setting.
///
/// When reduce motion is enabled the widget renders immediately without effects.
///
/// ```dart
/// MnAnimated(delay: 100.ms, child: MyCard()),
/// ```
class MnAnimated extends ConsumerWidget {
  const MnAnimated({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.slideYBegin = 0.04,
    this.duration = const Duration(milliseconds: 280),
  });

  final Widget child;
  final Duration delay;
  final double slideYBegin;
  final Duration duration;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reduceMotion = ref.watch(accessibilityProvider).reduceMotion;
    if (reduceMotion) return child;
    return child
        .animate(delay: delay)
        .fadeIn(duration: duration, curve: Curves.easeOut)
        .slideY(
          begin: slideYBegin,
          end: 0,
          duration: duration,
          curve: Curves.easeOut,
        );
  }
}

/// Staggered list — wraps each child with an increasing delay.
///
/// ```dart
/// MnStaggeredList(children: [Card1(), Card2(), Card3()])
/// ```
class MnStaggeredList extends StatelessWidget {
  const MnStaggeredList({
    super.key,
    required this.children,
    this.staggerMs = 80,
    this.baseDelayMs = 0,
  });

  final List<Widget> children;
  final int staggerMs;
  final int baseDelayMs;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < children.length; i++)
          MnAnimated(
            delay: Duration(milliseconds: baseDelayMs + staggerMs * i),
            child: children[i],
          ),
      ],
    );
  }
}

/// Scale-on-press wrapper — 0.96 scale when tapped.
/// Falls back to a plain GestureDetector when reduce motion is active.
class MnPressable extends StatefulWidget {
  const MnPressable({super.key, required this.child, required this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  State<MnPressable> createState() => _MnPressableState();
}

class _MnPressableState extends State<MnPressable> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 90),
        curve: Curves.easeInOut,
        child: widget.child,
      ),
    );
  }
}
