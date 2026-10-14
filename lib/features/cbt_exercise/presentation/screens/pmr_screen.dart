import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/exercise_entity.dart';
import '../providers/exercise_provider.dart';

// ─── PMR muscle groups ────────────────────────────────────────────────────────

const _kGroups = [
  (name: 'Tangan & Jari', instruction: 'Kepalkan kedua tangan sekuat mungkin.', emoji: '✊'),
  (name: 'Lengan Bawah', instruction: 'Tekuk pergelangan tangan ke atas, tahan.', emoji: '💪'),
  (name: 'Bahu & Leher', instruction: 'Angkat bahu setinggi mungkin ke telinga.', emoji: '🏔️'),
  (name: 'Wajah & Rahang', instruction: 'Kerutkan seluruh otot wajah, katupkan rahang.', emoji: '😬'),
  (name: 'Perut', instruction: 'Kencangkan otot perut seperti ingin menahan pukulan.', emoji: '🫁'),
  (name: 'Paha', instruction: 'Tekan kedua paha bersama-sama sekuat mungkin.', emoji: '🦵'),
  (name: 'Betis & Telapak Kaki', instruction: 'Angkat ujung kaki ke atas, kencangkan betis.', emoji: '🦶'),
];

enum _PmrPhase { intro, prepare, tense, release, rest, complete }

class PmrScreen extends ConsumerStatefulWidget {
  const PmrScreen({super.key});

  @override
  ConsumerState<PmrScreen> createState() => _PmrScreenState();
}

class _PmrScreenState extends ConsumerState<PmrScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _breathCtrl;
  Timer? _timer;

  _PmrPhase _phase = _PmrPhase.intro;
  int _groupIndex = 0;
  int _countdown = 5;

  // Durations (seconds)
  static const _introDur = 5;
  static const _prepareDur = 5;
  static const _tenseDur = 7;
  static const _releaseDur = 20;
  static const _restDur = 8;

  @override
  void initState() {
    super.initState();
    _breathCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _breathCtrl.dispose();
    super.dispose();
  }

  void _startTimer(int seconds, VoidCallback onDone) {
    _timer?.cancel();
    setState(() => _countdown = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      if (_countdown <= 1) {
        t.cancel();
        onDone();
      } else {
        setState(() => _countdown--);
      }
    });
  }

  void _startIntro() {
    setState(() => _phase = _PmrPhase.intro);
    _startTimer(_introDur, _startPrepare);
  }

  void _startPrepare() {
    if (_groupIndex >= _kGroups.length) { _complete(); return; }
    setState(() => _phase = _PmrPhase.prepare);
    _startTimer(_prepareDur, _startTense);
  }

  void _startTense() {
    setState(() => _phase = _PmrPhase.tense);
    _startTimer(_tenseDur, _startRelease);
  }

  void _startRelease() {
    setState(() => _phase = _PmrPhase.release);
    _startTimer(_releaseDur, _startRest);
  }

  void _startRest() {
    setState(() => _phase = _PmrPhase.rest);
    _startTimer(_restDur, () {
      setState(() => _groupIndex++);
      _startPrepare();
    });
  }

  void _complete() {
    _timer?.cancel();
    setState(() => _phase = _PmrPhase.complete);
    final user = ref.read(currentUserProvider);
    if (user != null) {
      ref
          .read(streakProvider.notifier)
          .markComplete(user.id, CbtExerciseType.pmr);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A2E2A),
      body: SafeArea(
        child: _phase == _PmrPhase.complete
            ? _CompletedView(onDone: () => context.pop())
            : _SessionView(
                phase: _phase,
                groupIndex: _groupIndex,
                countdown: _countdown,
                breathCtrl: _breathCtrl,
                onStart: _startIntro,
                onSkip: () {
                  _timer?.cancel();
                  setState(() => _groupIndex++);
                  _startPrepare();
                },
                onBack: () => context.pop(),
              ),
      ),
    );
  }
}

class _SessionView extends StatelessWidget {
  const _SessionView({
    required this.phase,
    required this.groupIndex,
    required this.countdown,
    required this.breathCtrl,
    required this.onStart,
    required this.onSkip,
    required this.onBack,
  });

  final _PmrPhase phase;
  final int groupIndex, countdown;
  final AnimationController breathCtrl;
  final VoidCallback onStart, onSkip, onBack;

  bool get _isIntro => phase == _PmrPhase.intro;

  String get _phaseLabel => switch (phase) {
        _PmrPhase.intro => 'Bersiaplah',
        _PmrPhase.prepare => 'Persiapkan',
        _PmrPhase.tense => 'Kencangkan!',
        _PmrPhase.release => 'Lepaskan & Rasakan',
        _PmrPhase.rest => 'Istirahat',
        _PmrPhase.complete => '',
      };

  Color get _phaseColor => switch (phase) {
        _PmrPhase.intro || _PmrPhase.prepare => const Color(0xFF4A9E8F),
        _PmrPhase.tense => const Color(0xFFE07B00),
        _PmrPhase.release => const Color(0xFF2E6DA4),
        _PmrPhase.rest => const Color(0xFF4A9E8F),
        _ => const Color(0xFF4A9E8F),
      };

  String get _instruction => _isIntro
      ? 'Duduk atau berbaring nyaman.\nTarik napas dalam-dalam dan biarkan tubuhmu rileks.\nKita akan mulai dengan tangan.'
      : groupIndex < _kGroups.length
          ? switch (phase) {
              _PmrPhase.prepare => _kGroups[groupIndex].instruction,
              _PmrPhase.tense =>
                'KENCANGKAN otot ini sekuat mungkin.\nTahan dan rasakan ketegangannya.',
              _PmrPhase.release =>
                'Sekarang LEPASKAN sepenuhnya.\nRasakan perbedaan antara tegang dan rileks.\nBiarkan otot meleleh.',
              _PmrPhase.rest =>
                'Istirahat sejenak.\nSadari rasa rileks yang menyebar\nke seluruh bagian tubuh ini.',
              _ => '',
            }
          : '';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Back + Progress
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white54),
                onPressed: onBack,
              ),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_kGroups.length, (i) {
                    return Container(
                      width: i == groupIndex ? 20 : 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: i < groupIndex
                            ? const Color(0xFF4A9E8F)
                            : i == groupIndex
                                ? Colors.white
                                : Colors.white24,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),
        ),

        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Group name
              if (!_isIntro && groupIndex < _kGroups.length) ...[
                Text(
                  _kGroups[groupIndex].emoji,
                  style: const TextStyle(fontSize: 56),
                ),
                const SizedBox(height: 8),
                Text(
                  '${groupIndex + 1}. ${_kGroups[groupIndex].name}',
                  style: AppTextStyles.h3.copyWith(color: Colors.white70),
                ),
                const SizedBox(height: 24),
              ],

              // Animated circle
              AnimatedBuilder(
                animation: breathCtrl,
                builder: (_, __) {
                  final scale = phase == _PmrPhase.tense
                      ? 1.0
                      : phase == _PmrPhase.release
                          ? 0.85 + 0.15 * breathCtrl.value
                          : 0.9 + 0.1 * breathCtrl.value;
                  return Transform.scale(
                    scale: scale,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _phaseColor.withValues(alpha: 0.2),
                        border: Border.all(
                            color: _phaseColor.withValues(alpha: 0.8),
                            width: 3),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$countdown',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 48,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
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

              const SizedBox(height: 28),

              // Phase label
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: _phaseColor.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _phaseColor.withValues(alpha: 0.5)),
                ),
                child: Text(
                  _phaseLabel,
                  style: TextStyle(
                    color: _phaseColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Instruction
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _instruction,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 15,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: _isIntro
              ? SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onStart,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF4A9E8F),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Mulai Sesi',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                )
              : Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onSkip,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white54,
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('Lewati Otot Ini'),
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _CompletedView extends StatelessWidget {
  const _CompletedView({required this.onDone});
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('🌿', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 72)),
          const SizedBox(height: 24),
          Text(
            'Sesi Selesai!',
            style: AppTextStyles.h2.copyWith(color: Colors.white),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Tubuhmu kini lebih rileks. Luangkan beberapa menit untuk menikmati rasa tenang ini sebelum beraktivitas kembali.',
            style: TextStyle(color: Colors.white70, fontSize: 15, height: 1.6),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          FilledButton(
            onPressed: onDone,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF4A9E8F),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('Selesai',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
