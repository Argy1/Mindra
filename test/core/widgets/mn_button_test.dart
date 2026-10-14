// Widget tests for MnButton — Mindra's primary button component.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/shared/widgets/mn_button.dart';

Widget _wrap(Widget child) => MaterialApp(
      home: Scaffold(body: Center(child: child)),
    );

void main() {
  group('MnButton — rendering', () {
    testWidgets('primary variant renders an ElevatedButton with its label',
        (tester) async {
      await tester.pumpWidget(_wrap(
        MnButton(label: 'Lanjutkan', onPressed: () {}),
      ));

      expect(find.text('Lanjutkan'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('secondary variant renders an OutlinedButton', (tester) async {
      await tester.pumpWidget(_wrap(
        MnButton(
          label: 'Batal',
          variant: MnButtonVariant.secondary,
          onPressed: () {},
        ),
      ));
      expect(find.byType(OutlinedButton), findsOneWidget);
    });

    testWidgets('ghost variant renders a TextButton', (tester) async {
      await tester.pumpWidget(_wrap(
        MnButton(
          label: 'Lewati',
          variant: MnButtonVariant.ghost,
          onPressed: () {},
        ),
      ));
      expect(find.byType(TextButton), findsOneWidget);
    });

    testWidgets('renders leading and trailing icons when provided',
        (tester) async {
      await tester.pumpWidget(_wrap(
        MnButton(
          label: 'Bagikan',
          onPressed: () {},
          leadingIcon: const Icon(Icons.share),
          trailingIcon: const Icon(Icons.arrow_forward),
        ),
      ));
      expect(find.byIcon(Icons.share), findsOneWidget);
      expect(find.byIcon(Icons.arrow_forward), findsOneWidget);
    });
  });

  group('MnButton — loading state', () {
    testWidgets('shows a spinner and hides the label while loading',
        (tester) async {
      await tester.pumpWidget(_wrap(
        MnButton(label: 'Simpan', isLoading: true, onPressed: () {}),
      ));
      await tester.pump(); // start the spinner animation

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Simpan'), findsNothing);
    });

    testWidgets('ignores taps while loading', (tester) async {
      var taps = 0;
      await tester.pumpWidget(_wrap(
        MnButton(
          label: 'Simpan',
          isLoading: true,
          onPressed: () => taps++,
        ),
      ));
      await tester.pump();

      await tester.tap(find.byType(MnButton));
      await tester.pump();
      expect(taps, 0);
    });
  });

  group('MnButton — disabled state', () {
    testWidgets('a null onPressed renders a disabled button', (tester) async {
      await tester.pumpWidget(_wrap(
        const MnButton(label: 'Nonaktif', onPressed: null),
      ));

      final raw = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(raw.onPressed, isNull);
      expect(raw.enabled, isFalse);
    });

    testWidgets('a disabled button does not fire on tap', (tester) async {
      await tester.pumpWidget(_wrap(
        const MnButton(label: 'Nonaktif', onPressed: null),
      ));

      await tester.tap(find.byType(MnButton));
      await tester.pump();
      // No callback to assert — the test passes by not throwing and the
      // button reporting itself disabled (covered above).
      expect(tester.takeException(), isNull);
    });
  });

  group('MnButton — interaction', () {
    testWidgets('invokes onPressed exactly once per tap', (tester) async {
      var taps = 0;
      await tester.pumpWidget(_wrap(
        MnButton(label: 'Tekan', onPressed: () => taps++),
      ));

      await tester.tap(find.byType(MnButton));
      await tester.pump();
      expect(taps, 1);

      await tester.tap(find.byType(MnButton));
      await tester.pump();
      expect(taps, 2);
    });
  });
}
