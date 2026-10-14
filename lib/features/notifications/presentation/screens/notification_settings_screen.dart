import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/notification_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../providers/notification_provider.dart';

class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(notificationSettingsProvider);
    final notifier = ref.read(notificationSettingsProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        title: Text('Notifikasi', style: AppTextStyles.h3),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenPadding,
          vertical: AppSpacing.md,
        ),
        children: [
          if (!settings.hasPermission) ...[
            _PermissionBanner(notifier: notifier),
            const SizedBox(height: AppSpacing.md),
          ],

          // ── Daily scheduled ─────────────────────────────────────────────
          _SectionLabel('Pengingat Terjadwal'),
          const SizedBox(height: AppSpacing.xs),

          _NotifCard(
            type: NotificationType.dailyMoodCheckin,
            settings: settings,
            notifier: notifier,
          ),
          const SizedBox(height: AppSpacing.xs),
          _NotifCard(
            type: NotificationType.nightReflection,
            settings: settings,
            notifier: notifier,
          ),
          const SizedBox(height: AppSpacing.xs),
          _NotifCard(
            type: NotificationType.weeklyInsight,
            settings: settings,
            notifier: notifier,
            subtitle: 'Setiap Senin, 09:00',
          ),

          const SizedBox(height: AppSpacing.md),

          // ── Conditional ─────────────────────────────────────────────────
          _SectionLabel('Berdasarkan Aktivitasmu'),
          const SizedBox(height: AppSpacing.xs),

          _NotifCard(
            type: NotificationType.assessmentReminder,
            settings: settings,
            notifier: notifier,
          ),
          const SizedBox(height: AppSpacing.xs),
          _NotifCard(
            type: NotificationType.moodPatternAlert,
            settings: settings,
            notifier: notifier,
            accentColor: AppColors.warning500,
          ),
          const SizedBox(height: AppSpacing.xs),
          _NotifCard(
            type: NotificationType.inactivityCheckin,
            settings: settings,
            notifier: notifier,
          ),
          const SizedBox(height: AppSpacing.xs),
          _NotifCard(
            type: NotificationType.consultationReminder,
            settings: settings,
            notifier: notifier,
          ),

          const SizedBox(height: AppSpacing.md),

          // ── DND ──────────────────────────────────────────────────────────
          _SectionLabel('Jangan Ganggu'),
          const SizedBox(height: AppSpacing.xs),
          _DndCard(settings: settings, notifier: notifier),

          const SizedBox(height: AppSpacing.xl),

          // Footnote
          Text(
            'Notifikasi kondisional muncul otomatis berdasarkan '
            'aktivitasmu — tidak ada jadwal tetap yang bisa diubah.',
            style:
                AppTextStyles.bodyS.copyWith(color: AppColors.fg4, height: 1.5),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission banner
// ─────────────────────────────────────────────────────────────────────────────

class _PermissionBanner extends StatelessWidget {
  const _PermissionBanner({required this.notifier});
  final NotificationSettingsNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.warning50,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.warning200),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_off_outlined,
              color: AppColors.warning700, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Izinkan notifikasi agar Mindra bisa mengingatkanmu.',
              style:
                  AppTextStyles.bodyS.copyWith(color: AppColors.warning700),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          TextButton(
            onPressed: () => notifier.requestPermission(),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.warning700,
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text('Izinkan', style: AppTextStyles.bodyS.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.warning700,
            )),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section label
// ─────────────────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Text(
        label,
        style: AppTextStyles.bodyS.copyWith(
          color: AppColors.fg4,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification card
// ─────────────────────────────────────────────────────────────────────────────

class _NotifCard extends StatelessWidget {
  const _NotifCard({
    required this.type,
    required this.settings,
    required this.notifier,
    this.subtitle,
    this.accentColor,
  });

  final NotificationType type;
  final NotificationSettings settings;
  final NotificationSettingsNotifier notifier;
  final String? subtitle;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final enabled = settings.isEnabled(type);
    final color = accentColor ?? AppColors.biru500;
    final bgColor = accentColor != null
        ? AppColors.warning50
        : AppColors.biru50;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon badge
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(type.icon, color: color, size: 18),
                ),
                const SizedBox(width: AppSpacing.sm),

                // Title + description
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(type.channelName,
                          style: AppTextStyles.bodyM
                              .copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Text(
                        subtitle ?? type.description,
                        style: AppTextStyles.bodyS
                            .copyWith(color: AppColors.fg3, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),

                // Preview + toggle
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: () => notifier.showPreview(type),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          Icons.notifications_outlined,
                          size: 18,
                          color: AppColors.fg4,
                        ),
                      ),
                    ),
                    Switch.adaptive(
                      value: enabled,
                      activeTrackColor: AppColors.biru500,
                      onChanged: (v) => notifier.setEnabled(type, v),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Time picker row (mood + reflection only, when enabled)
          if (enabled && type.supportsTimePicker) ...[
            const Divider(height: 1, color: AppColors.borderSoft),
            _TimePickerRow(type: type, settings: settings, notifier: notifier),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Time picker row
// ─────────────────────────────────────────────────────────────────────────────

class _TimePickerRow extends StatelessWidget {
  const _TimePickerRow({
    required this.type,
    required this.settings,
    required this.notifier,
  });

  final NotificationType type;
  final NotificationSettings settings;
  final NotificationSettingsNotifier notifier;

  @override
  Widget build(BuildContext context) {
    final isMood = type == NotificationType.dailyMoodCheckin;
    final time = isMood ? settings.moodTime : settings.reflectionTime;
    final isAdaptive = isMood && settings.moodTimeIsAdaptive;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      child: Row(
        children: [
          Icon(Icons.access_time_rounded, size: 14, color: AppColors.fg4),
          const SizedBox(width: 6),
          Text(
            'Waktu: ${settings.formatTime(time)}',
            style:
                AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
          ),
          const SizedBox(width: AppSpacing.xs),
          if (isAdaptive)
            _Chip(
              label: 'Adaptif',
              color: AppColors.sage500,
            ),
          const Spacer(),
          if (isMood && !isAdaptive)
            GestureDetector(
              onTap: () => notifier.enableAdaptiveMoodTime(),
              child: _Chip(label: 'Gunakan adaptif', color: AppColors.biru400),
            ),
          const SizedBox(width: AppSpacing.xs),
          GestureDetector(
            onTap: () => _pickTime(context, time, isMood),
            child: _Chip(label: 'Ubah', color: AppColors.fg3),
          ),
        ],
      ),
    );
  }

  Future<void> _pickTime(
      BuildContext context, TimeOfDay current, bool isMood) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: current,
      helpText: isMood ? 'Waktu cek suasana hati' : 'Waktu refleksi malam',
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    if (isMood) {
      await notifier.setMoodTime(picked);
    } else {
      await notifier.setReflectionTime(picked);
    }
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: AppTextStyles.bodyS.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 11,
          ),
        ),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// DND card
// ─────────────────────────────────────────────────────────────────────────────

class _DndCard extends StatelessWidget {
  const _DndCard({required this.settings, required this.notifier});
  final NotificationSettings settings;
  final NotificationSettingsNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.neutral100,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(Icons.do_not_disturb_on_outlined,
                      color: AppColors.neutral600, size: 18),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Jangan Ganggu',
                          style: AppTextStyles.bodyM
                              .copyWith(fontWeight: FontWeight.w600)),
                      Text(
                        'Tunda notifikasi selama jam tertentu',
                        style: AppTextStyles.bodyS
                            .copyWith(color: AppColors.fg3),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: settings.dndEnabled,
                  activeTrackColor: AppColors.biru500,
                  onChanged: (v) => notifier.setDnd(v),
                ),
              ],
            ),
          ),
          if (settings.dndEnabled) ...[
            const Divider(height: 1, color: AppColors.borderSoft),
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                children: [
                  Expanded(
                    child: _DndTimeTile(
                      label: 'Mulai',
                      time: settings.dndStart,
                      onTap: () => _pickTime(
                          context, settings.dndStart, true),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _DndTimeTile(
                      label: 'Selesai',
                      time: settings.dndEnd,
                      onTap: () => _pickTime(
                          context, settings.dndEnd, false),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _pickTime(
      BuildContext context, TimeOfDay current, bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: current,
      helpText: isStart ? 'Mulai jangan ganggu' : 'Selesai jangan ganggu',
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    if (isStart) {
      await notifier.setDndStart(picked);
    } else {
      await notifier.setDndEnd(picked);
    }
  }
}

class _DndTimeTile extends StatelessWidget {
  const _DndTimeTile({
    required this.label,
    required this.time,
    required this.onTap,
  });

  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
        decoration: BoxDecoration(
          color: AppColors.surfaceCanvas,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.borderSoft),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4)),
            const SizedBox(height: 2),
            Row(
              children: [
                Text(_fmt(time),
                    style: AppTextStyles.bodyM
                        .copyWith(fontWeight: FontWeight.w600)),
                const Spacer(),
                const Icon(Icons.edit_outlined,
                    size: 14, color: AppColors.fg4),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
