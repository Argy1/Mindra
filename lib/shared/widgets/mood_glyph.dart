import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum MoodType { tenang, syukur, bahagia, hangat, lelah, sedih, cemas }

extension MoodTypeX on MoodType {
  String get assetPath => 'assets/mood/${name}.svg';

  String get label => switch (this) {
        MoodType.tenang => 'Tenang',
        MoodType.syukur => 'Syukur',
        MoodType.bahagia => 'Bahagia',
        MoodType.hangat => 'Hangat',
        MoodType.lelah => 'Lelah',
        MoodType.sedih => 'Sedih',
        MoodType.cemas => 'Cemas',
      };
}

/// Mindra custom mood glyph — loaded from assets/mood/*.svg.
/// These are brand iconography, NOT emoji.
class MoodGlyph extends StatelessWidget {
  const MoodGlyph({
    super.key,
    required this.mood,
    this.size = 44,
  });

  final MoodType mood;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      mood.assetPath,
      width: size,
      height: size,
      fit: BoxFit.contain,
    );
  }
}

/// Grid of mood selector cells, used on mood check-in screens.
class MoodSelector extends StatelessWidget {
  const MoodSelector({
    super.key,
    required this.selected,
    required this.onSelect,
  });

  final MoodType? selected;
  final ValueChanged<MoodType> onSelect;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      childAspectRatio: 0.88,
      children: MoodType.values
          .map((m) => _MoodCell(
                mood: m,
                isSelected: selected == m,
                onTap: () => onSelect(m),
              ))
          .toList(),
    );
  }
}

class _MoodCell extends StatelessWidget {
  const _MoodCell({
    required this.mood,
    required this.isSelected,
    required this.onTap,
  });

  final MoodType mood;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFFEEF6F4) // sage-50
              : const Color(0xFFFFFFFF),
          borderRadius: BorderRadius.circular(14),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF7EBDAE).withValues(alpha: 0.3),
                    blurRadius: 0,
                    spreadRadius: 1.5,
                  ),
                ]
              : [
                  const BoxShadow(
                    color: Color(0x0A1E2A33),
                    blurRadius: 4,
                    offset: Offset(0, 1),
                  ),
                ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            MoodGlyph(mood: mood, size: 44),
            const SizedBox(height: 4),
            Text(
              mood.label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? const Color(0xFF2D5F56) // sage-700
                        : const Color(0xFF635E55), // neutral-600
                    fontSize: 10,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
