import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/journal_provider.dart';

enum _JPhase { idle, recording, review, saving }

const _kMaxSeconds = 600;

class VoiceJournalScreen extends ConsumerStatefulWidget {
  const VoiceJournalScreen({super.key});

  @override
  ConsumerState<VoiceJournalScreen> createState() => _VoiceJournalScreenState();
}

class _VoiceJournalScreenState extends ConsumerState<VoiceJournalScreen>
    with TickerProviderStateMixin {
  _JPhase _phase = _JPhase.idle;

  // Recording
  final _recorder = AudioRecorder();
  String? _tempPath;
  int _recordedSeconds = 0;
  Timer? _clockTimer;
  StreamSubscription<Amplitude>? _ampSub;
  // Full amplitude history of the current recording (one sample per ~120ms),
  // each normalised to 0–1. Drives the live waveform and the review waveform.
  final List<double> _ampHistory = [];
  List<double> _waveHeights = List.filled(28, 0.08);

  // Playback
  AudioPlayer? _player;
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription? _posSub, _durSub, _compSub;

  // Metadata
  String? _moodEmoji;
  final _noteCtrl = TextEditingController();
  String? _error;

  late final AnimationController _idlePulse;
  late final AnimationController _recPulse;

  @override
  void initState() {
    super.initState();
    _idlePulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _recPulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _ampSub?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _compSub?.cancel();
    _recorder.dispose();
    _player?.dispose();
    _noteCtrl.dispose();
    _idlePulse.dispose();
    _recPulse.dispose();
    _cleanTemp();
    super.dispose();
  }

  void _cleanTemp() {
    if (_tempPath != null) {
      final f = File(_tempPath!);
      if (f.existsSync()) f.deleteSync();
    }
  }

  Future<void> _startRecording() async {
    final perm = await Permission.microphone.request();
    if (!perm.isGranted) {
      setState(() => _error = 'Izin mikrofon diperlukan untuk merekam.');
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/vj_${DateTime.now().millisecondsSinceEpoch}.aac';

    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 128000),
      path: path,
    );
    _tempPath = path;
    _recordedSeconds = 0;
    _recPulse.repeat(reverse: true);

    // Real microphone amplitude — record reports current level in dBFS.
    _ampHistory.clear();
    _ampSub = _recorder
        .onAmplitudeChanged(const Duration(milliseconds: 120))
        .listen((amp) {
      if (!mounted) return;
      _ampHistory.add(_normalizeAmplitude(amp.current));
      setState(() => _waveHeights = _rollingWindow(_ampHistory, 28));
    });

    _clockTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _recordedSeconds++);
      if (_recordedSeconds >= _kMaxSeconds) _stopRecording();
    });

    setState(() {
      _phase = _JPhase.recording;
      _error = null;
    });
  }

  // Maps a dBFS amplitude (≈ -50 silent … 0 loudest) to a 0–1 bar height.
  static double _normalizeAmplitude(double dbfs) {
    const floor = -50.0;
    final norm = ((dbfs - floor) / -floor).clamp(0.0, 1.0);
    return norm.clamp(0.06, 1.0);
  }

  // Last [n] samples, left-padded with a low baseline when still short.
  static List<double> _rollingWindow(List<double> history, int n) {
    if (history.length >= n) {
      return history.sublist(history.length - n);
    }
    return [...List.filled(n - history.length, 0.06), ...history];
  }

  // Downsamples the full history into [n] averaged buckets for the review view.
  static List<double> _downsample(List<double> history, int n) {
    if (history.isEmpty) return List.filled(n, 0.06);
    if (history.length <= n) return _rollingWindow(history, n);
    final out = <double>[];
    final bucket = history.length / n;
    for (var i = 0; i < n; i++) {
      final start = (i * bucket).floor();
      final end = ((i + 1) * bucket).floor().clamp(start + 1, history.length);
      final slice = history.sublist(start, end);
      out.add(slice.reduce((a, b) => a + b) / slice.length);
    }
    return out;
  }

  Future<void> _stopRecording() async {
    _clockTimer?.cancel();
    _ampSub?.cancel();
    _recPulse.stop();

    final path = await _recorder.stop();
    if (path == null || !File(path).existsSync()) {
      setState(() {
        _phase = _JPhase.idle;
        _error = 'Rekaman gagal disimpan.';
      });
      return;
    }
    _tempPath = path;

    _player?.dispose();
    _player = AudioPlayer();
    await _player!.setSource(DeviceFileSource(path));
    final dur = await _player!.getDuration();
    _duration = dur ?? Duration(seconds: _recordedSeconds);

    _posSub = _player!.onPositionChanged.listen((pos) {
      if (mounted) setState(() => _position = pos);
    });
    _durSub = _player!.onDurationChanged.listen((dur) {
      if (mounted) setState(() => _duration = dur);
    });
    _compSub = _player!.onPlayerComplete.listen((_) {
      if (mounted)
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
    });

    _waveHeights = _downsample(_ampHistory, 28);
    setState(() => _phase = _JPhase.review);
  }

  Future<void> _togglePlay() async {
    if (_player == null) return;
    if (_isPlaying) {
      await _player!.pause();
      setState(() => _isPlaying = false);
    } else {
      await _player!.resume();
      setState(() => _isPlaying = true);
    }
  }

  Future<void> _save() async {
    final user = ref.read(currentUserProvider);
    if (user == null || _tempPath == null) return;
    setState(() {
      _phase = _JPhase.saving;
      _error = null;
    });
    try {
      await _player!.stop();
      await ref.read(voiceJournalListProvider.notifier).save(
            userId: user.id,
            localFilePath: _tempPath!,
            durationSeconds: _recordedSeconds.clamp(1, _kMaxSeconds),
            moodEmoji: _moodEmoji,
            note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
          );
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _phase = _JPhase.review;
          _error = errorMessage(e, fallback: 'Gagal menyimpan. Coba lagi.');
        });
      }
    }
  }

  void _discard() {
    _player?.stop();
    _player?.dispose();
    _player = null;
    _cleanTemp();
    _tempPath = null;
    _ampHistory.clear();
    _waveHeights = List.filled(28, 0.08);
    setState(() {
      _phase = _JPhase.idle;
      _moodEmoji = null;
      _noteCtrl.clear();
      _recordedSeconds = 0;
      _position = Duration.zero;
      _duration = Duration.zero;
      _isPlaying = false;
      _error = null;
    });
  }

  static String _fmt(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  static String _fmtDur(Duration d) => _fmt(d.inSeconds);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, size: 22),
          onPressed: () {
            _discard();
            context.pop();
          },
        ),
        title: Text('Jurnal Suaraku', style: AppTextStyles.h3),
        actions: [
          if (_phase == _JPhase.idle)
            TextButton(
              onPressed: () => context.push(AppRoutes.voiceJournalList),
              child: Text('Riwayat',
                  style:
                      AppTextStyles.bodyM.copyWith(color: AppColors.biru500)),
            ),
        ],
      ),
      body: _phase == _JPhase.saving
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _PrivacyNote(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_phase == _JPhase.idle) _buildIdle(),
                        if (_phase == _JPhase.recording) _buildRecording(),
                        if (_phase == _JPhase.review) _buildReview(),
                        if (_error != null) ...[
                          const SizedBox(height: 16),
                          Text(_error!,
                              style: AppTextStyles.bodyM
                                  .copyWith(color: AppColors.danger500),
                              textAlign: TextAlign.center),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildIdle() {
    return Column(
      children: [
        const SizedBox(height: 60),
        Text('Apa yang ingin kamu ceritakan hari ini?',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg2),
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text('Rekam pikiran, perasaan, atau refleksi harianmu.',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
            textAlign: TextAlign.center),
        const SizedBox(height: 60),
        Center(
          child: AnimatedBuilder(
            animation: _idlePulse,
            builder: (_, __) => GestureDetector(
              onTap: _startRecording,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 140 + 24 * _idlePulse.value,
                    height: 140 + 24 * _idlePulse.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.biru100
                          .withValues(alpha: 0.45 * (1 - _idlePulse.value)),
                    ),
                  ),
                  Container(
                    width: 120,
                    height: 120,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.biru500,
                      boxShadow: [
                        BoxShadow(
                            color: Color(0x402E6DA4),
                            blurRadius: 24,
                            spreadRadius: 4)
                      ],
                    ),
                    child: const Icon(Icons.mic_rounded,
                        color: Colors.white, size: 52),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text('Ketuk untuk mulai merekam',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
        const SizedBox(height: 6),
        Text('Maks. 10 menit',
            style: AppTextStyles.label
                .copyWith(color: AppColors.fg4, fontSize: 12)),
      ],
    );
  }

  Widget _buildRecording() {
    final remaining = _kMaxSeconds - _recordedSeconds;
    return Column(
      children: [
        const SizedBox(height: 32),
        Text(
          _fmt(_recordedSeconds),
          style: const TextStyle(
            fontSize: 52,
            fontWeight: FontWeight.w700,
            color: AppColors.danger500,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
        Text('/ ${_fmt(_kMaxSeconds)}',
            style: AppTextStyles.label.copyWith(color: AppColors.fg4)),
        const SizedBox(height: 32),
        _WaveformView(heights: _waveHeights, color: AppColors.danger500),
        const SizedBox(height: 32),
        if (remaining < 60)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('${remaining}s tersisa',
                style:
                    AppTextStyles.label.copyWith(color: AppColors.danger500)),
          ),
        Center(
          child: AnimatedBuilder(
            animation: _recPulse,
            builder: (_, __) => GestureDetector(
              onTap: _stopRecording,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 104 + 18 * _recPulse.value,
                    height: 104 + 18 * _recPulse.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.danger500.withValues(
                          alpha: 0.15 * (1 - _recPulse.value * 0.6)),
                    ),
                  ),
                  Container(
                    width: 92,
                    height: 92,
                    decoration: const BoxDecoration(
                        shape: BoxShape.circle, color: AppColors.danger500),
                    child: const Icon(Icons.stop_rounded,
                        color: Colors.white, size: 44),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text('Ketuk untuk berhenti',
            style: AppTextStyles.label.copyWith(color: AppColors.fg4)),
      ],
    );
  }

  Widget _buildReview() {
    final totalSec =
        _duration.inSeconds > 0 ? _duration.inSeconds : _recordedSeconds;
    final progress =
        totalSec > 0 ? (_position.inSeconds / totalSec).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        // Playback card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Column(
            children: [
              _WaveformView(heights: _waveHeights, color: AppColors.biru300),
              const SizedBox(height: 10),
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 3,
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 7),
                  overlayShape:
                      const RoundSliderOverlayShape(overlayRadius: 14),
                  activeTrackColor: AppColors.biru500,
                  inactiveTrackColor: AppColors.borderSoft,
                  thumbColor: AppColors.biru500,
                  overlayColor: AppColors.biru100,
                ),
                child: Slider(
                  value: progress,
                  onChanged: (v) async {
                    final t = Duration(seconds: (v * totalSec).round());
                    await _player?.seek(t);
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_fmtDur(_position),
                      style: AppTextStyles.label
                          .copyWith(color: AppColors.fg4, fontSize: 11)),
                  Text(_fmtDur(_duration),
                      style: AppTextStyles.label
                          .copyWith(color: AppColors.fg4, fontSize: 11)),
                ],
              ),
              const SizedBox(height: 10),
              GestureDetector(
                onTap: _togglePlay,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                      shape: BoxShape.circle, color: AppColors.biru500),
                  child: Icon(
                    _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),
        Text('Suasana hati (opsional)',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: ['😌', '🙂', '😊', '😐', '😔', '😰', '😤', '🥺']
              .map((e) => GestureDetector(
                    onTap: () =>
                        setState(() => _moodEmoji = _moodEmoji == e ? null : e),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _moodEmoji == e
                            ? AppColors.biru100
                            : AppColors.surfaceCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _moodEmoji == e
                              ? AppColors.biru400
                              : AppColors.borderSoft,
                        ),
                      ),
                      child: Text(e, style: const TextStyle(fontSize: 24)),
                    ),
                  ))
              .toList(),
        ),

        const SizedBox(height: 24),
        Text('Catatan (opsional)',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg2)),
        const SizedBox(height: 10),
        TextField(
          controller: _noteCtrl,
          maxLines: 3,
          maxLength: 200,
          style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
          decoration: InputDecoration(
            hintText: 'Tuliskan catatan singkat...',
            hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
            filled: true,
            fillColor: AppColors.surfaceCard,
            contentPadding: const EdgeInsets.all(14),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderSoft)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderSoft)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: AppColors.biru400, width: 1.5)),
            counterStyle: AppTextStyles.label
                .copyWith(color: AppColors.fg4, fontSize: 11),
          ),
        ),

        const SizedBox(height: 28),
        FilledButton(
          onPressed: _save,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.neutral900,
            foregroundColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            padding: const EdgeInsets.symmetric(vertical: 16),
            minimumSize: const Size(double.infinity, 0),
          ),
          child: Text('Simpan',
              style: AppTextStyles.bodyM
                  .copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: _discard,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger500,
            side: const BorderSide(color: AppColors.danger300),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            minimumSize: const Size(double.infinity, 0),
          ),
          child: Text('Buang & Rekam Ulang',
              style: AppTextStyles.bodyM.copyWith(color: AppColors.danger500)),
        ),
      ],
    );
  }
}

// ─── Reusable waveform bar visualization ──────────────────────────────────────

class _WaveformView extends StatelessWidget {
  const _WaveformView({required this.heights, required this.color});
  final List<double> heights;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: heights
            .map((h) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 80),
                    width: 3,
                    height: (56 * h).clamp(3.0, 56.0),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.4 + h * 0.6),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}

// ─── Privacy note chip ────────────────────────────────────────────────────────

class _PrivacyNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outline, size: 14, color: AppColors.biru500),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Hanya kamu yang bisa mendengar rekaman ini',
              style: AppTextStyles.label
                  .copyWith(color: AppColors.biru600, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
