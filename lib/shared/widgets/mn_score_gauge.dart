import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import '../../features/assessment/presentation/providers/assessment_provider.dart';

/// Semicircular speedometer-style gauge for assessment scores.
/// Arc goes left→right through the top. Zones are colored per instrument.
class MnScoreGauge extends StatelessWidget {
  const MnScoreGauge({
    super.key,
    required this.score,
    required this.maxScore,
    required this.instrumentId,
    this.size = 220.0,
  });

  final int score;
  final int maxScore;
  final String instrumentId;
  final double size;

  static Color tierColor(int tier) => switch (tier) {
        0 => AppColors.sage500,
        1 => AppColors.biru400,
        2 => AppColors.matahari500,
        _ => AppColors.danger500,
      };

  @override
  Widget build(BuildContext context) {
    final tier = AssessmentClinical.tier(instrumentId, score);
    final color = tierColor(tier);
    final label = AssessmentClinical.labelIndonesian(instrumentId, score);

    // Widget height = radius (upper half) + label area
    final height = size / 2 + 56.0;

    return SizedBox(
      width: size,
      height: height,
      child: Stack(
        children: [
          // ── Gauge arc ──────────────────────────────────────────────
          CustomPaint(
            size: Size(size, height),
            painter: _GaugePainter(
              score: score,
              maxScore: maxScore,
              instrumentId: instrumentId,
              tierColor: color,
            ),
          ),

          // ── Score number — centered at arc center ──────────────────
          Positioned(
            left: 0,
            right: 0,
            top: size / 2 - 38,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$score',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.displayL.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'dari $maxScore',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.meta,
                ),
              ],
            ),
          ),

          // ── Category badge ─────────────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  label,
                  style: AppTextStyles.label.copyWith(color: color),
                ),
              ),
            ),
          ),

          // ── Min / max tick labels ──────────────────────────────────
          Positioned(
            left: 4,
            top: size / 2 - 4,
            child: Text(
              '0',
              style: AppTextStyles.meta.copyWith(color: AppColors.fg4),
            ),
          ),
          Positioned(
            right: 4,
            top: size / 2 - 4,
            child: Text(
              '$maxScore',
              style: AppTextStyles.meta.copyWith(color: AppColors.fg4),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Painter ───────────────────────────────────────────────────────────────────

class _GaugePainter extends CustomPainter {
  const _GaugePainter({
    required this.score,
    required this.maxScore,
    required this.instrumentId,
    required this.tierColor,
  });

  final int score;
  final int maxScore;
  final String instrumentId;
  final Color tierColor;

  static const _sw = 14.0; // stroke width
  static const _start = pi; // 9 o'clock — left
  static const _sweep = -pi; // counterclockwise to 3 o'clock — right

  @override
  void paint(Canvas canvas, Size size) {
    // Center of the full circle at the bottom-center of the widget's upper half.
    final cx = size.width / 2;
    final cy = size.width / 2;
    final radius = cx - _sw;
    final rect = Rect.fromCircle(center: Offset(cx, cy), radius: radius);

    // ── 1. Background track ──────────────────────────────────────────
    canvas.drawArc(
      rect,
      _start,
      _sweep,
      false,
      Paint()
        ..color = AppColors.neutral200
        ..strokeWidth = _sw
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );

    // ── 2. Zone colour bands (thinner, behind progress) ───────────────
    for (final z in _zones()) {
      final s = (z.$1 / maxScore).clamp(0.0, 1.0);
      final e = (z.$2 / maxScore).clamp(0.0, 1.0);
      if (s >= e) continue;
      canvas.drawArc(
        rect,
        _start + s * _sweep,
        (e - s) * _sweep,
        false,
        Paint()
          ..color = z.$3.withValues(alpha: 0.22)
          ..strokeWidth = _sw - 3
          ..strokeCap = StrokeCap.butt
          ..style = PaintingStyle.stroke,
      );
    }

    // ── 3. Progress arc ───────────────────────────────────────────────
    final frac = (score / maxScore).clamp(0.0, 1.0);
    if (frac > 0) {
      canvas.drawArc(
        rect,
        _start,
        frac * _sweep,
        false,
        Paint()
          ..color = tierColor
          ..strokeWidth = _sw
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke,
      );

      // ── 4. White dot at tip (needle head) ──────────────────────────
      final endAngle = _start + frac * _sweep;
      final dx = cx + radius * cos(endAngle);
      final dy = cy + radius * sin(endAngle);
      canvas.drawCircle(
        Offset(dx, dy),
        _sw / 2 - 1,
        Paint()
          ..color = AppColors.surfaceRaised
          ..style = PaintingStyle.fill,
      );
    }
  }

  List<(double, double, Color)> _zones() => switch (instrumentId) {
        'phq9' => [
            (0, 4, AppColors.sage500),
            (4, 9, AppColors.biru400),
            (9, 14, AppColors.matahari500),
            (14, 27.0, AppColors.danger500),
          ],
        'gad7' => [
            (0, 4, AppColors.sage500),
            (4, 9, AppColors.biru400),
            (9, 14, AppColors.matahari500),
            (14, 21.0, AppColors.danger500),
          ],
        'pss10' => [
            (0, 13, AppColors.sage500),
            (13, 26, AppColors.matahari500),
            (26, 40.0, AppColors.danger500),
          ],
        _ /* srq20 */ => [
            (0, 5, AppColors.sage500),
            (5, 10, AppColors.biru400),
            (10, 15, AppColors.matahari500),
            (15, 20.0, AppColors.danger500),
          ],
      };

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.score != score ||
      old.maxScore != maxScore ||
      old.tierColor != tierColor;
}

