import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/telemedicine_provider.dart';

class VideoCallScreen extends ConsumerStatefulWidget {
  const VideoCallScreen({super.key, required this.consultationId});
  final String consultationId;

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  bool _micMuted = false;
  bool _camOff = false;
  bool _frontCamera = true;
  int _elapsedSeconds = 0;
  Timer? _timer;

  // Draggable PiP position
  Offset _pipOffset = const Offset(16, 120);

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsedSeconds++);
    });
  }

  String get _timerLabel {
    final m = (_elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (_elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final consultation = ref.watch(activeConsultationProvider);
    final therapistName = consultation?.psychologistName ?? 'Psikolog';
    final therapistPhoto = consultation?.psychologistPhotoUrl;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Remote video — full screen placeholder
          _RemoteVideoPlaceholder(
            name: therapistName,
            photoUrl: therapistPhoto,
          ),

          // Top bar — timer + name
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenPadding,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            color: AppColors.danger500,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _timerLabel,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      therapistName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Draggable local PiP
          Positioned(
            left: _pipOffset.dx,
            top: _pipOffset.dy,
            child: GestureDetector(
              onPanUpdate: (d) {
                final size = MediaQuery.sizeOf(context);
                setState(() {
                  _pipOffset = Offset(
                    (_pipOffset.dx + d.delta.dx).clamp(0, size.width - 96),
                    (_pipOffset.dy + d.delta.dy).clamp(0, size.height - 128),
                  );
                });
              },
              child: _LocalVideoPip(camOff: _camOff),
            ),
          ),

          // Control bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _ControlBar(
              micMuted: _micMuted,
              camOff: _camOff,
              onMicToggle: () => setState(() => _micMuted = !_micMuted),
              onCamToggle: () => setState(() => _camOff = !_camOff),
              onSwitchCam: () => setState(() => _frontCamera = !_frontCamera),
              onNote: () => _showNoteSheet(context),
              onEndCall: () => _showEndCallDialog(context),
            ),
          ),
        ],
      ),
    );
  }

  void _showNoteSheet(BuildContext context) {
    final ctrl = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceRaised,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.lg),
        ),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.screenPadding,
          AppSpacing.lg,
          AppSpacing.screenPadding,
          MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.neutral300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Catatan Sesi', style: AppTextStyles.h3),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: ctrl,
              maxLines: 5,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Tulis catatan penting dari sesi ini...',
                hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
                filled: true,
                fillColor: AppColors.surfaceCanvas,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: AppColors.borderSoft),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: AppColors.borderSoft),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide:
                      const BorderSide(color: AppColors.biru400, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              child: Text('Simpan',
                  style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showEndCallDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cardHero),
        ),
        title: Text('Akhiri Sesi?', style: AppTextStyles.h3),
        content: Text(
          'Sesi konsultasi akan diakhiri. Waktu berjalan: $_timerLabel.',
          style: AppTextStyles.bodyM.copyWith(color: AppColors.fg2),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Lanjutkan', style: AppTextStyles.bodyM),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.pop();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger500,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
            child: Text('Akhiri',
                style: AppTextStyles.buttonM.copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _RemoteVideoPlaceholder extends StatelessWidget {
  const _RemoteVideoPlaceholder({
    required this.name,
    this.photoUrl,
  });

  final String name;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0D1B2A), Color(0xFF1B2A3B)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Pulsing avatar ring
          _PulsingRing(
            child: ClipOval(
              child: photoUrl != null && photoUrl!.isNotEmpty
                  ? Image.network(
                      photoUrl!,
                      width: 96,
                      height: 96,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          _InitialsAvatar(name: name, size: 96),
                    )
                  : _InitialsAvatar(name: name, size: 96),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Video psikolog akan muncul saat Agora dikonfigurasi',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _PulsingRing extends StatefulWidget {
  const _PulsingRing({required this.child});
  final Widget child;

  @override
  State<_PulsingRing> createState() => _PulsingRingState();
}

class _PulsingRingState extends State<_PulsingRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, child) => Container(
        width: 96 + 24 * _anim.value,
        height: 96 + 24 * _anim.value,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.15 + 0.15 * _anim.value),
            width: 2,
          ),
        ),
        child: Center(child: child),
      ),
      child: widget.child,
    );
  }
}

class _LocalVideoPip extends StatelessWidget {
  const _LocalVideoPip({required this.camOff});
  final bool camOff;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      height: 120,
      decoration: BoxDecoration(
        color: camOff ? Colors.black : const Color(0xFF1A2535),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: camOff
          ? const Center(
              child: Icon(Icons.videocam_off_rounded,
                  color: Colors.white54, size: 28))
          : const Center(
              child:
                  Icon(Icons.person_rounded, color: Colors.white30, size: 40)),
    );
  }
}

class _ControlBar extends StatelessWidget {
  const _ControlBar({
    required this.micMuted,
    required this.camOff,
    required this.onMicToggle,
    required this.onCamToggle,
    required this.onSwitchCam,
    required this.onNote,
    required this.onEndCall,
  });

  final bool micMuted;
  final bool camOff;
  final VoidCallback onMicToggle;
  final VoidCallback onCamToggle;
  final VoidCallback onSwitchCam;
  final VoidCallback onNote;
  final VoidCallback onEndCall;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.lg,
        AppSpacing.screenPadding,
        MediaQuery.paddingOf(context).bottom + AppSpacing.lg,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withValues(alpha: 0.85),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _CtrlBtn(
            icon: micMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
            label: micMuted ? 'Bisu' : 'Mikrofon',
            active: !micMuted,
            onTap: onMicToggle,
          ),
          _CtrlBtn(
            icon: camOff ? Icons.videocam_off_rounded : Icons.videocam_rounded,
            label: camOff ? 'Kamera Off' : 'Kamera',
            active: !camOff,
            onTap: onCamToggle,
          ),
          _CtrlBtn(
            icon: Icons.flip_camera_ios_rounded,
            label: 'Balik',
            active: true,
            onTap: onSwitchCam,
          ),
          _CtrlBtn(
            icon: Icons.note_alt_outlined,
            label: 'Catat',
            active: true,
            onTap: onNote,
          ),
          // End call
          GestureDetector(
            onTap: onEndCall,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    color: AppColors.danger500,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.call_end_rounded,
                      color: Colors.white, size: 26),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Akhiri',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CtrlBtn extends StatelessWidget {
  const _CtrlBtn({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: active
                  ? Colors.white.withValues(alpha: 0.15)
                  : Colors.white.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon,
                color: active ? Colors.white : Colors.white38, size: 24),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: active ? Colors.white70 : Colors.white30,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.name, required this.size});
  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      color: AppColors.biru700,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.38,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
