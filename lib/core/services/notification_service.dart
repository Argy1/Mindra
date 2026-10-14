import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import 'notification_rules.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Notification type catalogue
// ─────────────────────────────────────────────────────────────────────────────

enum NotificationType {
  dailyMoodCheckin,
  assessmentReminder,
  moodPatternAlert,
  inactivityCheckin,
  consultationReminder,
  nightReflection,
  weeklyInsight;

  // IDs 1-7 for fixed notifications; 1000-2999 reserved for consultations.
  int get _baseId => index + 1;

  String get channelId => 'mindra_$name';

  String get channelName => switch (this) {
        dailyMoodCheckin => 'Cek Suasana Hati',
        assessmentReminder => 'Pengingat Asesmen',
        moodPatternAlert => 'Peringatan Pola Suasana Hati',
        inactivityCheckin => 'Ayo Kembali',
        consultationReminder => 'Pengingat Konsultasi',
        nightReflection => 'Refleksi Malam',
        weeklyInsight => 'Wawasan Mingguan',
      };

  String get description => switch (this) {
        dailyMoodCheckin => 'Pengingat harian untuk mencatat suasana hatimu',
        assessmentReminder => 'Ingatkan saat sudah waktunya asesmen lagi',
        moodPatternAlert => 'Peringatan ketika suasana hati terus menurun',
        inactivityCheckin => 'Sapaan ketika lama tidak membuka aplikasi',
        consultationReminder => 'Pengingat sebelum jadwal sesi konsultasi',
        nightReflection => 'Waktu refleksi dan syukur sebelum tidur',
        weeklyInsight => 'Ringkasan dan wawasan perjalananmu minggu ini',
      };

  IconData get icon => switch (this) {
        dailyMoodCheckin => Icons.mood_rounded,
        assessmentReminder => Icons.assignment_outlined,
        moodPatternAlert => Icons.warning_amber_rounded,
        inactivityCheckin => Icons.waving_hand_outlined,
        consultationReminder => Icons.video_call_outlined,
        nightReflection => Icons.nights_stay_outlined,
        weeklyInsight => Icons.insights_rounded,
      };

  bool get supportsTimePicker =>
      this == dailyMoodCheckin || this == nightReflection;

  bool get isHighPriority => this == moodPatternAlert;

  bool get isConditional =>
      this == assessmentReminder ||
      this == moodPatternAlert ||
      this == inactivityCheckin ||
      this == consultationReminder;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/// Manages local notifications for Mindra.
///
/// FCM requires google-services.json / GoogleService-Info.plist; until those
/// are configured this service handles scheduling via flutter_local_notifications
/// only. All methods are no-ops when [hasPermission] is false.
class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  bool _hasPermission = false;

  static const _openTimesKey = 'notif_app_opens';
  static const _adaptiveTimeKey = 'notif_adaptive_mood_time';
  static const _adaptiveComputedAtKey = 'notif_adaptive_computed_at';
  static const _hasPermissionKey = 'notif_has_permission';

  static const _moodBodies = [
    'Bagaimana perasaanmu hari ini? Luangkan 30 detik untuk mencatat.',
    'Suasana hatimu penting. Ceritakan sebentar?',
    'Hari ini kamu sudah melakukan banyak hal. Bagaimana rasanya?',
    'Mindra ingin tahu — bagaimana harimu berjalan?',
    'Satu menit saja. Bagaimana kondisimu sekarang?',
    'Sudah meluangkan waktu untuk dirimu sendiri hari ini?',
    'Ini waktumu. Bagaimana perasaanmu saat ini?',
  ];

  bool get isInitialized => _initialized;
  bool get hasPermission => _hasPermission;

  // ── Init ─────────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    if (_initialized) return;

    // Resolve local timezone by UTC offset — suitable for Indonesian devices.
    tz_data.initializeTimeZones();
    final offset = DateTime.now().timeZoneOffset.inHours;
    final tzName = switch (offset) {
      8 => 'Asia/Makassar',
      9 => 'Asia/Jayapura',
      _ => 'Asia/Jakarta',
    };
    try {
      tz.setLocalLocation(tz.getLocation(tzName));
    } catch (e) {
      debugPrint('Gagal memakai timezone $tzName, fallback ke UTC: $e');
      tz.setLocalLocation(tz.UTC);
    }

    await _plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestSoundPermission: false,
          requestBadgePermission: false,
          requestAlertPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: _onTap,
    );

    final prefs = await SharedPreferences.getInstance();
    _hasPermission = prefs.getBool(_hasPermissionKey) ?? false;
    _initialized = true;
  }

  // ── Permission ───────────────────────────────────────────────────────────

  Future<bool> requestPermission() async {
    final status = await Permission.notification.request();
    _hasPermission = status.isGranted;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hasPermissionKey, _hasPermission);
    if (_hasPermission) {
      await _plugin
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true);
    }
    return _hasPermission;
  }

  // ── Adaptive timing ──────────────────────────────────────────────────────

  /// Records the current open time and re-computes the adaptive schedule weekly.
  Future<void> trackAppOpen() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_openTimesKey);
    final times =
        raw != null ? (jsonDecode(raw) as List).cast<String>() : <String>[];

    times.add(DateTime.now().toIso8601String());

    final cutoff = DateTime.now().subtract(const Duration(days: 90));
    times.removeWhere((t) {
      final dt = DateTime.tryParse(t);
      return dt == null || dt.isBefore(cutoff);
    });
    await prefs.setString(_openTimesKey, jsonEncode(times));

    final lastStr = prefs.getString(_adaptiveComputedAtKey);
    final lastComputed = lastStr != null ? DateTime.tryParse(lastStr) : null;
    if (lastComputed == null ||
        DateTime.now().difference(lastComputed).inDays >= 7) {
      await _recomputeAdaptiveTime(prefs, times);
    }
  }

  Future<TimeOfDay> computeAdaptiveMoodTime() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_adaptiveTimeKey);
    if (stored != null) {
      final parts = stored.split(':');
      if (parts.length == 2) {
        final h = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        if (h != null && m != null) return TimeOfDay(hour: h, minute: m);
      }
    }
    return const TimeOfDay(hour: 8, minute: 30);
  }

  Future<void> _recomputeAdaptiveTime(
      SharedPreferences prefs, List<String> rawTimes) async {
    if (rawTimes.length < 5) return;
    final minutesList = rawTimes
        .map((s) => DateTime.tryParse(s))
        .whereType<DateTime>()
        .map((dt) => dt.hour * 60 + dt.minute)
        .toList();
    final avg = minutesList.reduce((a, b) => a + b) ~/ minutesList.length;
    final notifMinutes = (avg - 30).clamp(6 * 60, 22 * 60);
    await prefs.setString(
        _adaptiveTimeKey, '${notifMinutes ~/ 60}:${notifMinutes % 60}');
    await prefs.setString(
        _adaptiveComputedAtKey, DateTime.now().toIso8601String());
  }

  // ── Schedulable notifications ─────────────────────────────────────────────

  /// Schedules the recurring daily mood check-in reminder.
  ///
  /// When [hasCheckedInToday] is true, [NotificationRules] suppresses today's
  /// occurrence — the first reminder is pushed to tomorrow so the user is
  /// never nudged to do something they have already done. Call again (with
  /// `hasCheckedInToday: true`) right after a mood is saved to drop today's
  /// pending reminder.
  Future<void> scheduleDailyMoodCheckin(
    TimeOfDay time, {
    bool hasCheckedInToday = false,
  }) async {
    if (!_initialized || !_hasPermission) return;
    await _plugin.cancel(NotificationType.dailyMoodCheckin._baseId);
    final body = _moodBodies[
        (DateTime.now().millisecondsSinceEpoch ~/ 86400000) %
            _moodBodies.length];

    var firstFire = _nextDailyAt(time.hour, time.minute);
    if (!NotificationRules.shouldSendDailyCheckinReminder(
          hasCheckedInToday: hasCheckedInToday,
        ) &&
        _isToday(firstFire)) {
      firstFire = firstFire.add(const Duration(days: 1));
    }

    await _plugin.zonedSchedule(
      NotificationType.dailyMoodCheckin._baseId,
      'Cek suasana hatimu ☀️',
      body,
      firstFire,
      _details(NotificationType.dailyMoodCheckin),
      payload: '/home/mood',
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  bool _isToday(tz.TZDateTime dt) {
    final now = tz.TZDateTime.now(tz.local);
    return dt.year == now.year && dt.month == now.month && dt.day == now.day;
  }

  Future<void> cancelDailyMoodCheckin() async {
    await _plugin.cancel(NotificationType.dailyMoodCheckin._baseId);
  }

  Future<void> scheduleNightReflection(TimeOfDay time) async {
    if (!_initialized || !_hasPermission) return;
    await _plugin.cancel(NotificationType.nightReflection._baseId);
    await _plugin.zonedSchedule(
      NotificationType.nightReflection._baseId,
      'Waktu refleksi malam 🌙',
      'Luangkan beberapa menit untuk mensyukuri harimu.',
      _nextDailyAt(time.hour, time.minute),
      _details(NotificationType.nightReflection),
      payload: '/home/reflection',
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  Future<void> cancelNightReflection() async {
    await _plugin.cancel(NotificationType.nightReflection._baseId);
  }

  Future<void> scheduleWeeklyInsight() async {
    if (!_initialized || !_hasPermission) return;
    await _plugin.cancel(NotificationType.weeklyInsight._baseId);
    await _plugin.zonedSchedule(
      NotificationType.weeklyInsight._baseId,
      'Wawasan mingguanmu siap 📊',
      'Lihat bagaimana perjalananmu minggu lalu dan rencanakan minggu ini.',
      _nextWeekdayAt(DateTime.monday, 9, 0),
      _details(NotificationType.weeklyInsight),
      payload: '/home',
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
    );
  }

  Future<void> cancelWeeklyInsight() async {
    await _plugin.cancel(NotificationType.weeklyInsight._baseId);
  }

  Future<void> scheduleConsultationReminder({
    required String consultationId,
    required DateTime scheduledAt,
  }) async {
    if (!_initialized || !_hasPermission) return;
    final hash = consultationId.hashCode.abs() % 900 + 100;
    final dayBefore = scheduledAt.subtract(const Duration(days: 1));
    final hourBefore = scheduledAt.subtract(const Duration(hours: 1));

    if (dayBefore.isAfter(DateTime.now())) {
      await _plugin.zonedSchedule(
        1000 + hash,
        'Konsultasi besok 📅',
        'Sesi konsultasimu dijadwalkan besok pukul '
            '${_fmt(scheduledAt)}. Siapkan dirimu.',
        _toTZ(dayBefore),
        _details(NotificationType.consultationReminder),
        payload: '/home/telemedicine/history',
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    }
    if (hourBefore.isAfter(DateTime.now())) {
      await _plugin.zonedSchedule(
        2000 + hash,
        'Konsultasi 1 jam lagi ⏰',
        'Sesi konsultasimu dimulai dalam 1 jam. '
            'Pastikan koneksi internetmu stabil.',
        _toTZ(hourBefore),
        _details(NotificationType.consultationReminder),
        payload: '/home/telemedicine/history',
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    }
  }

  Future<void> cancelConsultationReminder(String consultationId) async {
    final hash = consultationId.hashCode.abs() % 900 + 100;
    await _plugin.cancel(1000 + hash);
    await _plugin.cancel(2000 + hash);
  }

  // ── Conditional triggers ──────────────────────────────────────────────────

  Future<void> maybeNotifyAssessmentDue(
      {required DateTime? lastAssessmentAt}) async {
    if (!_initialized || !_hasPermission) return;
    if (!NotificationRules.shouldRemindAssessment(
      lastAssessmentAt: lastAssessmentAt,
      now: DateTime.now(),
    )) {
      return;
    }
    await _plugin.show(
      NotificationType.assessmentReminder._baseId,
      'Sudah waktunya asesmen 📝',
      'Sudah lebih dari 2 minggu sejak asesmen terakhirmu. '
          'Cek bagaimana kondisimu sekarang.',
      _details(NotificationType.assessmentReminder),
      payload: '/home/assessment',
    );
  }

  Future<void> maybeNotifyMoodPattern({required List<int> recentScores}) async {
    if (!_initialized || !_hasPermission) return;
    if (!NotificationRules.shouldAlertLowMoodPattern(recentScores)) return;
    await _plugin.show(
      NotificationType.moodPatternAlert._baseId,
      'Kamu tidak sendirian 💙',
      'Mindra melihat kamu sedang melewati hari-hari yang berat. '
          'Ada yang bisa kami bantu?',
      _details(NotificationType.moodPatternAlert, isHighPriority: true),
      payload: '/home/ai-chat',
    );
  }

  /// Shows only when app has been unopened for ≥7 days AND user had ≥5 opens
  /// in the 30 days before the inactive period — never guilt-trips.
  Future<void> maybeNotifyInactivity() async {
    if (!_initialized || !_hasPermission) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_openTimesKey);
    if (raw == null) return;
    final times = (jsonDecode(raw) as List)
        .cast<String>()
        .map((s) => DateTime.tryParse(s))
        .whereType<DateTime>()
        .toList()
      ..sort();
    if (times.isEmpty) return;
    final lastOpen = times.last;
    if (DateTime.now().difference(lastOpen).inDays < 7) return;
    final prior30Cutoff = lastOpen.subtract(const Duration(days: 30));
    final priorOpens = times
        .where((t) => t.isAfter(prior30Cutoff) && t.isBefore(lastOpen))
        .length;
    if (priorOpens < 5) return;
    await _plugin.show(
      NotificationType.inactivityCheckin._baseId,
      'Hei, sudah lama tidak bertemu 👋',
      'Tidak ada tekanan — hanya ingin memastikan kamu baik-baik saja.',
      _details(NotificationType.inactivityCheckin),
      payload: '/home',
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  Future<void> showPreview(NotificationType type) async {
    if (!_initialized) return;
    if (!_hasPermission) {
      await requestPermission();
      if (!_hasPermission) return;
    }
    final (title, body) = _previewContent(type);
    await _plugin.show(
      0,
      title,
      body,
      _details(type, isHighPriority: type.isHighPriority),
    );
  }

  (String, String) _previewContent(NotificationType type) => switch (type) {
        NotificationType.dailyMoodCheckin => (
            'Cek suasana hatimu ☀️',
            'Bagaimana perasaanmu hari ini? Luangkan 30 detik untuk mencatat.'
          ),
        NotificationType.assessmentReminder => (
            'Sudah waktunya asesmen 📝',
            'Sudah lebih dari 2 minggu sejak asesmen terakhirmu.'
          ),
        NotificationType.moodPatternAlert => (
            'Kamu tidak sendirian 💙',
            'Mindra melihat kamu sedang melewati hari-hari yang berat.'
          ),
        NotificationType.inactivityCheckin => (
            'Hei, sudah lama tidak bertemu 👋',
            'Tidak ada tekanan — hanya ingin memastikan kamu baik-baik saja.'
          ),
        NotificationType.consultationReminder => (
            'Konsultasi besok 📅',
            'Sesi konsultasimu dijadwalkan besok. Siapkan dirimu.'
          ),
        NotificationType.nightReflection => (
            'Waktu refleksi malam 🌙',
            'Luangkan beberapa menit untuk mensyukuri harimu.'
          ),
        NotificationType.weeklyInsight => (
            'Wawasan mingguanmu siap 📊',
            'Lihat bagaimana perjalananmu minggu lalu.'
          ),
      };

  // ── Cancel all ────────────────────────────────────────────────────────────

  Future<void> cancelAll() async => _plugin.cancelAll();

  // ── Internal helpers ──────────────────────────────────────────────────────

  NotificationDetails _details(
    NotificationType type, {
    bool isHighPriority = false,
  }) {
    return NotificationDetails(
      android: AndroidNotificationDetails(
        type.channelId,
        type.channelName,
        channelDescription: type.description,
        importance: isHighPriority ? Importance.max : Importance.high,
        priority: isHighPriority ? Priority.max : Priority.high,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
  }

  tz.TZDateTime _nextDailyAt(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var t = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (t.isBefore(now)) t = t.add(const Duration(days: 1));
    return t;
  }

  tz.TZDateTime _nextWeekdayAt(int weekday, int hour, int minute) {
    var dt = tz.TZDateTime.now(tz.local).add(const Duration(days: 1));
    while (dt.weekday != weekday) {
      dt = dt.add(const Duration(days: 1));
    }
    return tz.TZDateTime(tz.local, dt.year, dt.month, dt.day, hour, minute);
  }

  tz.TZDateTime _toTZ(DateTime dt) => tz.TZDateTime.from(dt, tz.local);

  String _fmt(DateTime dt) => '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';

  static void _onTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null && payload.isNotEmpty) {
      SharedPreferences.getInstance().then(
        (p) => p.setString('notif_pending_route', payload),
      );
    }
  }
}
