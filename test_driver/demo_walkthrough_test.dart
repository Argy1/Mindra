// Automated demo walkthrough for the Kemenkes pitch.
//
// Connects to the app booted by `demo_walkthrough.dart`, steps through the 7
// pitch scenarios, and writes a screenshot for each stage into
// `demo_screenshots/` — useful both for a hands-free demo run and for
// generating consistent slides for the pitch deck.
//
// Run:
//   flutter drive --target=test_driver/demo_walkthrough.dart
//
// This is a plain Dart program (not a `package:test` suite) so it stays
// compatible with the project's dependency set. Every step is wrapped: a
// failing/unreachable step is logged and skipped, never aborting the run —
// because a live demo aid must degrade gracefully.

import 'dart:io';

import 'package:flutter_driver/flutter_driver.dart';

late FlutterDriver driver;
int _shotIndex = 0;
int _passed = 0;
int _skipped = 0;

const _timeout = Duration(seconds: 12);

Future<void> main() async {
  stdout.writeln('── Mindra demo walkthrough ───────────────────────────────');
  driver = await FlutterDriver.connect();
  await driver.waitUntilFirstFrameRasterized();

  Directory('demo_screenshots').createSync(recursive: true);

  await _shot('00_app_launch', 'App launch / splash');

  await _scenario1NewUserAssessment();
  await _scenario2DailyCheckinWeeklyInsight();
  await _scenario3AiCompanion();
  await _scenario4BookConsultation();
  await _scenario5SosCrisis();
  await _scenario6SatusehatSync();
  await _scenario7PdfReport();

  stdout.writeln('──────────────────────────────────────────────────────────');
  stdout.writeln('Walkthrough done — $_passed step(s) captured, '
      '$_skipped skipped. Screenshots in ./demo_screenshots/');

  await driver.close();
  exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1 — New user → onboarding → first PHQ-9 → results
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario1NewUserAssessment() async {
  stdout.writeln('\n▶ Scenario 1 — Onboarding & first PHQ-9 assessment');
  await _shot('01a_landing', 'Landing / onboarding or home');
  await _step('open Assessment tab', () async {
    await _tapText('Asesmen');
  });
  await _shot('01b_assessment_list', 'Assessment catalogue');
  await _step('open PHQ-9', () async {
    await _tapText('Skala Depresi PHQ-9');
  });
  await _shot('01c_phq9_intro', 'PHQ-9 detail / intro');
  await _step('begin PHQ-9 questions', () async {
    await _tapTextIfPresent('Mulai');
  });
  await _shot('01d_phq9_question', 'PHQ-9 first question');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2 — Daily check-in → mood input → weekly insight
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario2DailyCheckinWeeklyInsight() async {
  stdout.writeln('\n▶ Scenario 2 — Daily mood check-in & weekly insight');
  await _step('go home', () async => _tapTextIfPresent('Beranda'));
  await _step('open Mood check-in', () async => _tapText('Mood Hari Ini'));
  await _shot('02a_mood_checkin', 'Mood check-in screen');
  await _step('pick a mood (Tenang)', () async => _tapTextIfPresent('Tenang'));
  await _shot('02b_mood_selected', 'Mood selected');
  await _step('open Weekly Insight', () async {
    await _tapText('Laporan Minggu Ini');
  });
  await _shot('02c_weekly_insight', 'Weekly insight dashboard');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3 — AI companion conversation
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario3AiCompanion() async {
  stdout.writeln('\n▶ Scenario 3 — AI companion conversation');
  await _step('open AI companion', () async => _tapText('Ngobrol AI'));
  await _shot('03a_ai_companion', 'AI companion chat');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4 — Booking a telemedicine consultation
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario4BookConsultation() async {
  stdout.writeln('\n▶ Scenario 4 — Book a telemedicine consultation');
  await _step('open Telemedicine', () async => _tapText('Konsultasi'));
  await _shot('04a_psychologist_list', 'Psychologist list');
  await _step('open a psychologist profile', () async {
    await _tapTextIfPresent('Lihat Profil');
  });
  await _shot('04b_psychologist_detail', 'Psychologist detail / booking');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5 — SOS button → crisis resources
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario5SosCrisis() async {
  stdout.writeln('\n▶ Scenario 5 — SOS / crisis resources');
  await _step('go home', () async => _tapTextIfPresent('Beranda'));
  await _step('tap SOS (Bantuan)', () async => _tapText('Bantuan'));
  await _shot('05a_crisis_screen', 'Crisis resources screen');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6 — SATUSEHAT data sync
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario6SatusehatSync() async {
  stdout.writeln('\n▶ Scenario 6 — SATUSEHAT data sync');
  await _step('open Profile', () async => _tapText('Profil'));
  await _shot('06a_profile', 'Profile screen');
  await _step('open SATUSEHAT consent', () async {
    await _tapTextIfPresent('SATUSEHAT');
  });
  await _shot('06b_satusehat_sync', 'SATUSEHAT sync / consent');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 7 — PDF report generation
// ─────────────────────────────────────────────────────────────────────────────

Future<void> _scenario7PdfReport() async {
  stdout.writeln('\n▶ Scenario 7 — PDF report generation');
  await _step('open Profile', () async => _tapTextIfPresent('Profil'));
  await _step('open PDF report', () async => _tapText('Laporan PDF'));
  await _shot('07a_pdf_report', 'PDF report screen');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Runs a named step, tolerating failure so the walkthrough never aborts.
Future<void> _step(String label, Future<void> Function() action) async {
  try {
    await action();
    stdout.writeln('  ✓ $label');
  } catch (e) {
    _skipped++;
    stdout.writeln('  ⚠ skipped "$label" — ${_short(e)}');
  }
}

/// Captures a screenshot into demo_screenshots/ with a sequential prefix.
Future<void> _shot(String name, String caption) async {
  try {
    final bytes = await driver.screenshot();
    final idx = (_shotIndex++).toString().padLeft(2, '0');
    final file = File('demo_screenshots/${idx}_$name.png');
    await file.writeAsBytes(bytes);
    _passed++;
    stdout.writeln('  📸 $caption → ${file.path}');
  } catch (e) {
    _skipped++;
    stdout.writeln('  ⚠ screenshot "$name" failed — ${_short(e)}');
  }
}

/// Waits for [text] to appear, then taps it. Throws if not found in time.
Future<void> _tapText(String text) async {
  final finder = find.text(text);
  await driver.waitFor(finder, timeout: _timeout);
  await driver.tap(finder, timeout: _timeout);
  await _settle();
}

/// Best-effort tap — silently does nothing if [text] is not on screen.
Future<void> _tapTextIfPresent(String text) async {
  try {
    final finder = find.text(text);
    await driver.waitFor(finder, timeout: const Duration(seconds: 4));
    await driver.tap(finder);
    await _settle();
  } catch (_) {
    // Not present — acceptable for an optional navigation hop.
  }
}

/// Lets animations and route transitions finish before the next action.
Future<void> _settle() async {
  try {
    await driver.waitUntilNoTransientCallbacks(timeout: _timeout);
  } catch (_) {
    await Future<void>.delayed(const Duration(milliseconds: 600));
  }
}

String _short(Object e) {
  final s = e.toString();
  return s.length > 90 ? '${s.substring(0, 90)}…' : s;
}
