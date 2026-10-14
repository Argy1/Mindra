import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/services/notification_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Service provider
// ─────────────────────────────────────────────────────────────────────────────

final notificationServiceProvider = Provider<NotificationService>(
  (_) => NotificationService.instance,
);

// ─────────────────────────────────────────────────────────────────────────────
// Settings state
// ─────────────────────────────────────────────────────────────────────────────

class NotificationSettings {
  NotificationSettings({
    Map<NotificationType, bool>? enabled,
    this.moodTime = const TimeOfDay(hour: 8, minute: 30),
    this.moodTimeIsAdaptive = true,
    this.reflectionTime = const TimeOfDay(hour: 21, minute: 0),
    this.dndEnabled = false,
    this.dndStart = const TimeOfDay(hour: 22, minute: 0),
    this.dndEnd = const TimeOfDay(hour: 7, minute: 0),
    this.hasPermission = false,
  }) : enabled = enabled ??
            {for (final t in NotificationType.values) t: true};

  final Map<NotificationType, bool> enabled;
  final TimeOfDay moodTime;
  final bool moodTimeIsAdaptive;
  final TimeOfDay reflectionTime;
  final bool dndEnabled;
  final TimeOfDay dndStart;
  final TimeOfDay dndEnd;
  final bool hasPermission;

  bool isEnabled(NotificationType type) => enabled[type] ?? false;

  NotificationSettings copyWith({
    Map<NotificationType, bool>? enabled,
    TimeOfDay? moodTime,
    bool? moodTimeIsAdaptive,
    TimeOfDay? reflectionTime,
    bool? dndEnabled,
    TimeOfDay? dndStart,
    TimeOfDay? dndEnd,
    bool? hasPermission,
  }) =>
      NotificationSettings(
        enabled: enabled ?? this.enabled,
        moodTime: moodTime ?? this.moodTime,
        moodTimeIsAdaptive: moodTimeIsAdaptive ?? this.moodTimeIsAdaptive,
        reflectionTime: reflectionTime ?? this.reflectionTime,
        dndEnabled: dndEnabled ?? this.dndEnabled,
        dndStart: dndStart ?? this.dndStart,
        dndEnd: dndEnd ?? this.dndEnd,
        hasPermission: hasPermission ?? this.hasPermission,
      );

  String formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:'
      '${t.minute.toString().padLeft(2, '0')}';
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifier
// ─────────────────────────────────────────────────────────────────────────────

class NotificationSettingsNotifier
    extends StateNotifier<NotificationSettings> {
  NotificationSettingsNotifier(this._ref)
      : super(NotificationSettings()) {
    _load();
  }

  final Ref _ref;
  static const _p = 'notif_';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final service = _ref.read(notificationServiceProvider);

    final enabled = {
      for (final t in NotificationType.values)
        t: prefs.getBool('${_p}enabled_${t.name}') ?? true,
    };

    final moodAdaptive = prefs.getBool('${_p}mood_adaptive') ?? true;
    TimeOfDay moodTime = TimeOfDay(
      hour: prefs.getInt('${_p}mood_h') ?? 8,
      minute: prefs.getInt('${_p}mood_m') ?? 30,
    );
    if (moodAdaptive) {
      moodTime = await service.computeAdaptiveMoodTime();
    }

    state = NotificationSettings(
      enabled: enabled,
      moodTime: moodTime,
      moodTimeIsAdaptive: moodAdaptive,
      reflectionTime: TimeOfDay(
        hour: prefs.getInt('${_p}refl_h') ?? 21,
        minute: prefs.getInt('${_p}refl_m') ?? 0,
      ),
      dndEnabled: prefs.getBool('${_p}dnd') ?? false,
      dndStart: TimeOfDay(
        hour: prefs.getInt('${_p}dnd_start_h') ?? 22,
        minute: prefs.getInt('${_p}dnd_start_m') ?? 0,
      ),
      dndEnd: TimeOfDay(
        hour: prefs.getInt('${_p}dnd_end_h') ?? 7,
        minute: prefs.getInt('${_p}dnd_end_m') ?? 0,
      ),
      hasPermission: service.hasPermission,
    );
  }

  Future<void> setEnabled(NotificationType type, bool value) async {
    if (value && !state.hasPermission) {
      final granted =
          await _ref.read(notificationServiceProvider).requestPermission();
      if (!granted) return;
      state = state.copyWith(hasPermission: true);
    }
    state = state.copyWith(enabled: {...state.enabled, type: value});
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('${_p}enabled_${type.name}', value);
    await _reschedule(type, value);
  }

  Future<void> setMoodTime(TimeOfDay time) async {
    state = state.copyWith(moodTime: time, moodTimeIsAdaptive: false);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('${_p}mood_h', time.hour);
    await prefs.setInt('${_p}mood_m', time.minute);
    await prefs.setBool('${_p}mood_adaptive', false);
    if (state.isEnabled(NotificationType.dailyMoodCheckin)) {
      await _ref
          .read(notificationServiceProvider)
          .scheduleDailyMoodCheckin(time);
    }
  }

  Future<void> enableAdaptiveMoodTime() async {
    final service = _ref.read(notificationServiceProvider);
    final adaptiveTime = await service.computeAdaptiveMoodTime();
    state =
        state.copyWith(moodTime: adaptiveTime, moodTimeIsAdaptive: true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('${_p}mood_adaptive', true);
    if (state.isEnabled(NotificationType.dailyMoodCheckin)) {
      await service.scheduleDailyMoodCheckin(adaptiveTime);
    }
  }

  Future<void> setReflectionTime(TimeOfDay time) async {
    state = state.copyWith(reflectionTime: time);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('${_p}refl_h', time.hour);
    await prefs.setInt('${_p}refl_m', time.minute);
    if (state.isEnabled(NotificationType.nightReflection)) {
      await _ref
          .read(notificationServiceProvider)
          .scheduleNightReflection(time);
    }
  }

  Future<void> setDnd(bool enabled) async {
    state = state.copyWith(dndEnabled: enabled);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('${_p}dnd', enabled);
  }

  Future<void> setDndStart(TimeOfDay time) async {
    state = state.copyWith(dndStart: time);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('${_p}dnd_start_h', time.hour);
    await prefs.setInt('${_p}dnd_start_m', time.minute);
  }

  Future<void> setDndEnd(TimeOfDay time) async {
    state = state.copyWith(dndEnd: time);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('${_p}dnd_end_h', time.hour);
    await prefs.setInt('${_p}dnd_end_m', time.minute);
  }

  Future<void> requestPermission() async {
    final granted =
        await _ref.read(notificationServiceProvider).requestPermission();
    if (granted) state = state.copyWith(hasPermission: true);
  }

  Future<void> showPreview(NotificationType type) async {
    await _ref.read(notificationServiceProvider).showPreview(type);
  }

  Future<void> _reschedule(NotificationType type, bool enable) async {
    final service = _ref.read(notificationServiceProvider);
    switch (type) {
      case NotificationType.dailyMoodCheckin:
        if (enable) {
          await service.scheduleDailyMoodCheckin(state.moodTime);
        } else {
          await service.cancelDailyMoodCheckin();
        }
      case NotificationType.nightReflection:
        if (enable) {
          await service.scheduleNightReflection(state.reflectionTime);
        } else {
          await service.cancelNightReflection();
        }
      case NotificationType.weeklyInsight:
        if (enable) {
          await service.scheduleWeeklyInsight();
        } else {
          await service.cancelWeeklyInsight();
        }
      default:
        // Conditional types have no persistent schedule to manage here.
        break;
    }
  }
}

final notificationSettingsProvider = StateNotifierProvider<
    NotificationSettingsNotifier, NotificationSettings>(
  (ref) => NotificationSettingsNotifier(ref),
);
