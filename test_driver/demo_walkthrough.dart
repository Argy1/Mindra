// Instrumented entrypoint for the flutter_driver demo walkthrough.
//
// This boots the real Mindra app with the Flutter Driver extension enabled so
// `test_driver/demo_walkthrough_test.dart` can connect and drive it.
//
// Run the full walkthrough with:
//   flutter drive --target=test_driver/demo_walkthrough.dart
//
// Prerequisites:
//   * A connected device or running emulator.
//   * A valid .env (Supabase URL + anon key).
//   * The demo account ("Ayu Rahmawati") seeded via DemoDataSeeder and, ideally,
//     already signed in so the walkthrough can reach the authenticated screens.

import 'package:flutter_driver/driver_extension.dart';

import 'package:mindra/main.dart' as app;

Future<void> main() async {
  // Must be called before runApp — opens the channel the driver connects to.
  enableFlutterDriverExtension();

  // Delegates to the real app bootstrap (dotenv, Supabase, notifications,
  // SharedPreferences override, then runApp).
  await app.main();
}
