// Widget tests for MoodSelector — the 7-mood check-in grid.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/shared/widgets/mood_glyph.dart';

Widget _wrap(Widget child) => MaterialApp(
      home: Scaffold(body: child),
    );

void main() {
  group('MoodSelector — rendering', () {
    testWidgets('renders all 7 mood options', (tester) async {
      await tester.pumpWidget(_wrap(
        MoodSelector(selected: null, onSelect: (_) {}),
      ));

      // One glyph + one label per mood type.
      expect(find.byType(MoodGlyph), findsNWidgets(MoodType.values.length));
      expect(MoodType.values, hasLength(7));

      for (final mood in MoodType.values) {
        expect(find.text(mood.label), findsOneWidget,
            reason: 'missing label for ${mood.name}');
      }
    });

    testWidgets('mood labels are the expected Indonesian terms',
        (tester) async {
      await tester.pumpWidget(_wrap(
        MoodSelector(selected: null, onSelect: (_) {}),
      ));
      for (final label in const [
        'Tenang',
        'Syukur',
        'Bahagia',
        'Hangat',
        'Lelah',
        'Sedih',
        'Cemas',
      ]) {
        expect(find.text(label), findsOneWidget);
      }
    });
  });

  group('MoodSelector — selection', () {
    testWidgets('tapping a mood reports that mood to onSelect', (tester) async {
      MoodType? picked;
      await tester.pumpWidget(_wrap(
        MoodSelector(selected: null, onSelect: (m) => picked = m),
      ));

      await tester.tap(find.text('Bahagia'));
      await tester.pump();
      expect(picked, MoodType.bahagia);

      await tester.tap(find.text('Cemas'));
      await tester.pump();
      expect(picked, MoodType.cemas);
    });

    testWidgets('each of the 7 moods is independently selectable',
        (tester) async {
      final tapped = <MoodType>[];
      await tester.pumpWidget(_wrap(
        MoodSelector(selected: null, onSelect: tapped.add),
      ));

      for (final mood in MoodType.values) {
        await tester.tap(find.text(mood.label));
        await tester.pump();
      }
      expect(tapped, MoodType.values);
    });

    testWidgets('selected mood renders with a distinct (animated) state',
        (tester) async {
      await tester.pumpWidget(_wrap(
        MoodSelector(selected: MoodType.bahagia, onSelect: (_) {}),
      ));
      // Selection styling is driven by AnimatedContainer in each cell.
      expect(find.byType(AnimatedContainer),
          findsNWidgets(MoodType.values.length));
      await tester.pump(const Duration(milliseconds: 200));
      expect(tester.takeException(), isNull);
    });
  });

  group('MoodTypeX — domain mapping', () {
    test('every mood maps to a non-empty label and an SVG asset path', () {
      for (final mood in MoodType.values) {
        expect(mood.label, isNotEmpty);
        expect(mood.assetPath, endsWith('.svg'));
        expect(mood.assetPath, contains(mood.name));
      }
    });
  });
}
