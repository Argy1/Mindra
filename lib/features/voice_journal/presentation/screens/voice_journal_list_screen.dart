import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../providers/journal_provider.dart';

class VoiceJournalListScreen extends ConsumerStatefulWidget {
  const VoiceJournalListScreen({super.key});

  @override
  ConsumerState<VoiceJournalListScreen> createState() =>
      _VoiceJournalListScreenState();
}

class _VoiceJournalListScreenState
    extends ConsumerState<VoiceJournalListScreen> {
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final state = ref.watch(voiceJournalListProvider);
    final notifier = ref.read(voiceJournalListProvider.notifier);

    if (!_loaded && user != null) {
      _loaded = true;
      WidgetsBinding.instance
          .addPostFrameCallback((_) => notifier.load(user.id));
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Riwayat Jurnal Suara', style: AppTextStyles.h3),
      ),
      body: Column(
        children: [
          // Security notice
          Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.sage50,
              borderRadius: BorderRadius.circular(10),
              border:
                  Border.all(color: AppColors.sage500.withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.security_outlined,
                    size: 16, color: AppColors.sage500),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Rekaman disimpan terenkripsi. Tidak ada pihak lain yang dapat mengaksesnya termasuk tim Mindra.',
                    style: AppTextStyles.label
                        .copyWith(color: AppColors.sage600, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),

          // List
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.error != null
                    ? _ErrorView(
                        message: state.error!,
                        onRetry:
                            user == null ? null : () => notifier.load(user.id),
                      )
                    : state.entries.isEmpty
                        ? _EmptyView()
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                            itemCount: state.entries.length,
                            itemBuilder: (_, i) => _EntryTile(
                              entry: state.entries[i],
                              onDelete: () =>
                                  _confirmDelete(context, state.entries[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, VoiceJournalEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus rekaman?'),
        content: const Text(
            'Rekaman ini akan dihapus permanen dan tidak dapat dipulihkan.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Hapus', style: TextStyle(color: AppColors.danger500)),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(voiceJournalListProvider.notifier).delete(entry);
    }
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.mic_none_rounded, size: 64, color: AppColors.fg4),
          const SizedBox(height: 16),
          Text('Belum ada jurnal suara',
              style: AppTextStyles.h4.copyWith(color: AppColors.fg3)),
          const SizedBox(height: 6),
          Text('Rekam perasaanmu hari ini.',
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
        ],
      ),
    );
  }
}

// ─── Entry tile with inline player ───────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 56,
              color: AppColors.danger500,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onRetry,
                child: const Text('Coba lagi'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EntryTile extends ConsumerStatefulWidget {
  const _EntryTile({required this.entry, required this.onDelete});
  final VoiceJournalEntry entry;
  final VoidCallback onDelete;

  @override
  ConsumerState<_EntryTile> createState() => _EntryTileState();
}

class _EntryTileState extends ConsumerState<_EntryTile> {
  AudioPlayer? _player;
  bool _isPlaying = false;
  bool _isLoading = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription? _posSub, _durSub, _compSub;
  String? _localPath;

  @override
  void dispose() {
    _posSub?.cancel();
    _durSub?.cancel();
    _compSub?.cancel();
    _player?.dispose();
    _deleteLocal();
    super.dispose();
  }

  void _deleteLocal() {
    if (_localPath != null) {
      final f = File(_localPath!);
      if (f.existsSync()) f.deleteSync();
    }
  }

  Future<void> _togglePlay() async {
    if (_isLoading) return;
    if (_player == null) {
      setState(() => _isLoading = true);
      try {
        final dir = await getTemporaryDirectory();
        final path = await ref
            .read(voiceJournalListProvider.notifier)
            .downloadForPlayback(widget.entry, dir.path);
        _localPath = path;

        _player = AudioPlayer();
        await _player!.setSource(DeviceFileSource(path));
        final dur = await _player!.getDuration();
        _duration = dur ?? Duration(seconds: widget.entry.durationSeconds);

        _posSub = _player!.onPositionChanged.listen((p) {
          if (mounted) setState(() => _position = p);
        });
        _durSub = _player!.onDurationChanged.listen((d) {
          if (mounted) setState(() => _duration = d);
        });
        _compSub = _player!.onPlayerComplete.listen((_) {
          if (mounted)
            setState(() {
              _isPlaying = false;
              _position = Duration.zero;
            });
        });

        await _player!.resume();
        if (mounted)
          setState(() {
            _isPlaying = true;
            _isLoading = false;
          });
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage(
                e,
                fallback: 'Gagal memutar jurnal suara.',
              )),
              backgroundColor: AppColors.danger500,
            ),
          );
        }
      }
      return;
    }

    if (_isPlaying) {
      await _player!.pause();
      setState(() => _isPlaying = false);
    } else {
      await _player!.resume();
      setState(() => _isPlaying = true);
    }
  }

  static String _fmt(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final e = widget.entry;
    final dateLabel =
        DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(e.recordedAt);
    final hasDuration = _duration.inSeconds > 0;
    final totalSec = hasDuration ? _duration.inSeconds : e.durationSeconds;
    final progress =
        totalSec > 0 ? (_position.inSeconds / totalSec).clamp(0.0, 1.0) : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 8, 0),
            child: Row(
              children: [
                if (e.moodEmoji != null) ...[
                  Text(e.moodEmoji!, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(dateLabel,
                          style: AppTextStyles.bodyM.copyWith(
                              color: AppColors.fg1,
                              fontWeight: FontWeight.w600)),
                      Text(e.durationLabel,
                          style: AppTextStyles.label
                              .copyWith(color: AppColors.fg4, fontSize: 12)),
                    ],
                  ),
                ),
                // Delete button
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      size: 20, color: AppColors.fg4),
                  onPressed: widget.onDelete,
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),

          if (e.note != null && e.note!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
              child: Text(
                e.note!,
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),

          // Inline player
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Row(
              children: [
                // Play/pause
                GestureDetector(
                  onTap: _togglePlay,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                        shape: BoxShape.circle, color: AppColors.biru500),
                    child: _isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(10),
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Icon(
                            _isPlaying
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 22),
                  ),
                ),
                const SizedBox(width: 10),
                // Progress bar
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 4,
                          backgroundColor: AppColors.borderSoft,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                              AppColors.biru400),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_fmt(_position.inSeconds)} / ${_fmt(totalSec)}',
                        style: AppTextStyles.label
                            .copyWith(color: AppColors.fg4, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
