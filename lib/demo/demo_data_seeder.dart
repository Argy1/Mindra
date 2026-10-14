import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

/// Seeds a realistic dataset for the Kemenkes pitch demo.
///
/// The demo persona is **Ayu Rahmawati**, 28, Jakarta — a user three weeks
/// into her mental-health journey, showing a gentle recovery arc:
/// anxious/low at first, steadily improving toward a calmer baseline.
///
/// Usage (call once, signed in as the demo account):
/// ```dart
/// final seeder = DemoDataSeeder(Supabase.instance.client);
/// final report = await seeder.reseed(
///   userId: Supabase.instance.client.auth.currentUser!.id,
/// );
/// debugPrint(report.toString());
/// ```
///
/// Every table write is wrapped so one failure never aborts the rest; the
/// returned [DemoSeedReport] lists row counts and any warnings (e.g. RLS or
/// schema mismatches), so the operator can see exactly what landed.
class DemoDataSeeder {
  DemoDataSeeder(this._client);

  final SupabaseClient _client;
  static const _uuid = Uuid();

  /// The demo persona.
  static const demoName = 'Ayu Rahmawati';
  static const demoCity = 'Jakarta';
  static const demoGender = 'perempuan';
  static const demoDateOfBirth = '1998-03-15'; // 28 years old

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /// Clears the demo user's data, then seeds a fresh dataset.
  Future<DemoSeedReport> reseed({required String userId}) async {
    await clearDemoData(userId: userId);
    return seed(userId: userId);
  }

  /// Seeds the full demo dataset for [userId].
  Future<DemoSeedReport> seed({required String userId}) async {
    final report = DemoSeedReport();
    final now = DateTime.now();

    await _run(report, 'profiles', () => _seedProfile(userId));
    await _run(report, 'mood_entries', () => _seedMoods(userId, now));
    await _run(report, 'sleep_entries', () => _seedSleep(userId, now));
    await _run(report, 'assessments', () => _seedAssessments(userId, now));
    await _run(
        report, 'night_reflections', () => _seedReflections(userId, now));
    await _run(report, 'exercise_sessions', () => _seedCbt(userId, now));
    await _run(report, 'voice_journals', () => _seedVoiceJournals(userId, now));
    await _run(
        report, 'ai_conversations', () => _seedAiConversations(userId, now));
    await _run(report, 'consultations', () => _seedConsultations(userId, now));

    return report;
  }

  /// Deletes every demo row owned by [userId]. Safe to call repeatedly.
  Future<void> clearDemoData({required String userId}) async {
    for (final table in const [
      'mood_entries',
      'sleep_entries',
      'assessments',
      'night_reflections',
      'cbt_exercises',
      'voice_journals',
      'ai_conversations',
      'consultations',
    ]) {
      try {
        await _client.from(table).delete().eq('user_id', userId);
      } catch (_) {
        // Table may not exist in this environment — ignore.
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Profile
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedProfile(String userId) async {
    await _client.from('profiles').update({
      'name': demoName,
      'city': demoCity,
      'gender': demoGender,
      'date_of_birth': demoDateOfBirth,
    }).eq('id', userId);
    return 1;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mood — 30 days, a recovery arc (anxious/low → calmer)
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedMoods(String userId, DateTime now) async {
    // Index 0 = 29 days ago … index 29 = today.
    const arc = <String>[
      // Week 1 — hardest
      'cemas', 'sedih', 'lelah', 'cemas', 'sedih', 'lelah', 'cemas', 'lelah',
      // Week 2 — still heavy, first calm days
      'lelah', 'cemas', 'lelah', 'tenang', 'lelah', 'cemas', 'tenang',
      // Week 3 — turning the corner
      'tenang', 'lelah', 'tenang', 'hangat', 'tenang', 'syukur', 'hangat',
      'tenang',
      // Week 4 — steadier, brighter
      'syukur', 'tenang', 'bahagia', 'hangat', 'syukur', 'tenang', 'bahagia',
    ];

    const notes = <String>[
      'Hari yang berat, sulit fokus di kantor.',
      'Kepikiran terus soal deadline.',
      'Capek banget, pengen istirahat panjang.',
      'Sempat menangis tanpa sebab yang jelas.',
      'Coba latihan napas, sedikit membantu.',
      'Ngobrol dengan teman, lega rasanya.',
      'Tidur lebih nyenyak semalam.',
      'Mulai bisa menikmati pagi lagi.',
      'Jalan pagi sebentar, pikiran terasa lebih ringan.',
      'Bersyukur untuk hal-hal kecil hari ini.',
      'Hari yang tenang dan cukup produktif.',
      'Merasa lebih terhubung dengan diri sendiri.',
    ];

    const triggerPool = <List<String>>[
      ['pekerjaan', 'tidur'],
      ['keuangan'],
      ['keluarga'],
      ['kesehatan', 'tidur'],
      ['hubungan'],
      <String>[],
      ['media_sosial'],
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < arc.length; i++) {
      final day = now.subtract(Duration(days: 29 - i));
      final at = DateTime(day.year, day.month, day.day, 20, 15);
      final energy = _energyFor(arc[i]);
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'mood_type': arc[i],
        'note': notes[i % notes.length],
        'energy_level': energy,
        'triggers': triggerPool[i % triggerPool.length],
        'created_at': at.toIso8601String(),
      });
    }
    await _client.from('mood_entries').insert(rows);
    return rows.length;
  }

  int _energyFor(String mood) => switch (mood) {
        'bahagia' || 'syukur' => 5,
        'tenang' || 'hangat' => 4,
        'lelah' => 2,
        'cemas' => 2,
        'sedih' => 1,
        _ => 3,
      };

  // ───────────────────────────────────────────────────────────────────────────
  // Sleep — 14 days, improving quality & duration
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedSleep(String userId, DateTime now) async {
    // Index 0 = 13 days ago … index 13 = last night.
    const quality = <int>[2, 2, 3, 2, 3, 3, 3, 4, 3, 4, 4, 5, 4, 5];
    // Hours of sleep, paired with quality.
    const hours = <double>[
      5.0, 5.5, 6.0, 5.0, 6.5, 6.0, 6.5, 7.5, 6.5, 7.5, 8.0, 8.0, 7.5, 8.0,
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < quality.length; i++) {
      final day = now.subtract(Duration(days: 13 - i));
      // Bedtime the previous evening (~23:00), wake the next morning.
      final bedtime =
          DateTime(day.year, day.month, day.day, 23, 0).subtract(
        const Duration(days: 1),
      );
      final wake = bedtime.add(
        Duration(minutes: (hours[i] * 60).round()),
      );
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'bedtime': bedtime.toIso8601String(),
        'wake_time': wake.toIso8601String(),
        'quality': quality[i],
        'notes': quality[i] <= 2
            ? 'Sering terbangun tengah malam.'
            : quality[i] >= 4
                ? 'Tidur cukup nyenyak.'
                : 'Tidur lumayan, agak susah memulai.',
      });
    }
    await _client.from('sleep_entries').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Assessments — PHQ-9 (skor 7, Ringan) + GAD-7 (skor 11, Sedang)
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedAssessments(String userId, DateTime now) async {
    // PHQ-9: 9 items, answers sum to 7 → 'mild' / Ringan.
    const phq9Answers = <int>[1, 1, 1, 1, 1, 1, 1, 0, 0];
    // GAD-7: 7 items, answers sum to 11 → 'moderate' / Sedang.
    const gad7Answers = <int>[2, 2, 2, 2, 1, 1, 1];

    final rows = <Map<String, dynamic>>[
      {
        'id': _uuid.v4(),
        'user_id': userId,
        'type': 'phq9',
        'answers': [
          for (var i = 0; i < phq9Answers.length; i++)
            {'question_id': 'phq9_${i + 1}', 'score': phq9Answers[i]},
        ],
        'total_score': 7,
        'category': 'mild',
        'completed_at':
            now.subtract(const Duration(days: 21)).toIso8601String(),
        'sent_to_satusehat': true,
      },
      {
        'id': _uuid.v4(),
        'user_id': userId,
        'type': 'gad7',
        'answers': [
          for (var i = 0; i < gad7Answers.length; i++)
            {'question_id': 'gad7_${i + 1}', 'score': gad7Answers[i]},
        ],
        'total_score': 11,
        'category': 'moderate',
        'completed_at':
            now.subtract(const Duration(days: 20)).toIso8601String(),
        'sent_to_satusehat': true,
      },
    ];
    await _client.from('assessments').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Night reflections — 20 nights
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedReflections(String userId, DateTime now) async {
    const gratitude = <String>[
      'Bersyukur masih punya keluarga yang mendukung.',
      'Hari ini sempat tertawa lepas bersama teman.',
      'Cuaca cerah dan kopi pagi terasa nikmat.',
      'Bisa menyelesaikan satu tugas yang tertunda.',
      'Ada waktu untuk diri sendiri sore ini.',
    ];
    const challenges = <String>[
      'Masih sulit mengendalikan rasa khawatir di malam hari.',
      'Energi cepat habis padahal pekerjaan menumpuk.',
      'Sulit fokus saat rapat panjang.',
      'Kurang tidur membuat mood gampang turun.',
    ];
    const insight = <String>[
      'Aku sadar istirahat bukan kemalasan, tapi kebutuhan.',
      'Latihan napas benar-benar membantu menenangkan.',
      'Berbagi cerita membuat beban terasa lebih ringan.',
      'Langkah kecil tetap langkah maju.',
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < 20; i++) {
      // 20 nights spread across the last 28 days.
      final day = now.subtract(Duration(days: 27 - i - (i ~/ 7)));
      final dateStr = _dateOnly(day);
      final answers = <Map<String, dynamic>>[
        {
          'question_id': 1,
          'question_text': 'Apa yang kamu syukuri malam ini?',
          'answer': gratitude[i % gratitude.length],
          'category': 'gratitude',
        },
        {
          'question_id': 2,
          'question_text': 'Apa yang terasa sulit hari ini?',
          'answer': challenges[i % challenges.length],
          'category': 'challenges',
        },
        if (i.isEven)
          {
            'question_id': 3,
            'question_text': 'Apa yang kamu pelajari tentang dirimu?',
            'answer': insight[i % insight.length],
            'category': 'insight',
          },
      ];
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'date': dateStr,
        'answers': answers,
        'mood_after': 2 + (i % 4), // 2–5
        'created_at':
            DateTime(day.year, day.month, day.day, 21, 30).toIso8601String(),
      });
    }
    await _client.from('night_reflections').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CBT exercises — 10 completed sessions in `exercise_sessions`
  // (the table the app actually writes to via markExerciseComplete)
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedCbt(String userId, DateTime now) async {
    // exercise_type values must match CbtExerciseType.id.
    const types = <String>[
      'breathing',
      'thought_record',
      'pmr',
      'behavioral_activation',
      'breathing',
      'thought_record',
      'pmr',
      'breathing',
      'behavioral_activation',
      'pmr',
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < types.length; i++) {
      final day = now.subtract(Duration(days: 26 - (i * 26 ~/ 9)));
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'exercise_type': types[i],
        'completed_at':
            DateTime(day.year, day.month, day.day, 19, 0).toIso8601String(),
      });
    }
    await _client.from('exercise_sessions').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Voice journals — 5 entries (metadata only; no audio uploaded)
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedVoiceJournals(String userId, DateTime now) async {
    const entries = <(String emoji, int seconds, String note)>[
      ('😟', 95, 'Mencurahkan rasa cemas sebelum tidur.'),
      ('😔', 140, 'Cerita soal hari yang melelahkan di kantor.'),
      ('😌', 110, 'Refleksi setelah latihan pernapasan.'),
      ('🙂', 80, 'Catatan kecil tentang hal yang disyukuri.'),
      ('😊', 125, 'Merasa lebih ringan minggu ini.'),
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < entries.length; i++) {
      final day = now.subtract(Duration(days: 24 - i * 5));
      final at = DateTime(day.year, day.month, day.day, 22, 0);
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        // Placeholder path — demo seeds metadata only, no audio is uploaded.
        'storage_path': '$userId/demo_voice_${i + 1}.enc',
        'duration_seconds': entries[i].$2,
        'mood_emoji': entries[i].$1,
        'note': entries[i].$3,
        'recorded_at': at.toIso8601String(),
        'created_at': at.toIso8601String(),
      });
    }
    await _client.from('voice_journals').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AI companion — 5 conversation sessions
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedAiConversations(String userId, DateTime now) async {
    final sessions = <List<Map<String, String>>>[
      [
        {'role': 'user', 'content': 'Aku merasa cemas terus akhir-akhir ini.'},
        {
          'role': 'assistant',
          'content':
              'Terima kasih sudah berbagi. Kecemasan memang melelahkan. '
                  'Boleh ceritakan, kapan rasa cemas itu paling terasa?'
        },
        {'role': 'user', 'content': 'Biasanya malam hari sebelum tidur.'},
        {
          'role': 'assistant',
          'content':
              'Itu sangat umum. Malam hari pikiran cenderung lebih aktif. '
                  'Mau coba latihan napas 4-7-8 bersama sebelum tidur nanti?'
        },
      ],
      [
        {'role': 'user', 'content': 'Hari ini berat sekali di kantor.'},
        {
          'role': 'assistant',
          'content':
              'Maaf harimu terasa berat. Kamu sudah melewatinya — itu '
                  'bukan hal kecil. Apa satu hal yang membantumu bertahan?'
        },
        {'role': 'user', 'content': 'Mungkin ngobrol sebentar dengan teman.'},
        {
          'role': 'assistant',
          'content':
              'Koneksi dengan orang lain itu menyembuhkan. Semoga kamu '
                  'bisa beristirahat cukup malam ini.'
        },
      ],
      [
        {'role': 'user', 'content': 'Aku susah tidur lagi.'},
        {
          'role': 'assistant',
          'content':
              'Tidur yang terganggu bisa sangat menguras. Sudah coba '
                  'mengurangi layar satu jam sebelum tidur?'
        },
        {'role': 'user', 'content': 'Belum, biasanya main HP sampai larut.'},
        {
          'role': 'assistant',
          'content':
              'Tidak apa-apa, kita mulai pelan. Coba malam ini letakkan HP '
                  '30 menit lebih awal dan dengarkan suara yang menenangkan.'
        },
      ],
      [
        {'role': 'user', 'content': 'Hari ini aku merasa sedikit lebih baik.'},
        {
          'role': 'assistant',
          'content':
              'Senang sekali mendengarnya. Apa yang menurutmu membuat '
                  'perbedaan hari ini?'
        },
        {'role': 'user', 'content': 'Aku jalan pagi dan tidurku cukup.'},
        {
          'role': 'assistant',
          'content':
              'Itu kombinasi yang kuat. Tubuh dan pikiran saling terhubung '
                  '— teruskan kebiasaan baik ini ya.'
        },
      ],
      [
        {'role': 'user', 'content': 'Aku ingin lebih konsisten merawat diri.'},
        {
          'role': 'assistant',
          'content':
              'Niat itu sudah langkah besar. Mau kita mulai dari satu '
                  'kebiasaan kecil yang realistis untuk minggu ini?'
        },
        {'role': 'user', 'content': 'Boleh, mungkin refleksi malam tiap hari.'},
        {
          'role': 'assistant',
          'content':
              'Pilihan yang lembut dan bermakna. Aku akan menemanimu. '
                  'Tiga kalimat singkat tiap malam sudah cukup.'
        },
      ],
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < sessions.length; i++) {
      final day = now.subtract(Duration(days: 25 - i * 5));
      final at = DateTime(day.year, day.month, day.day, 21, 0);
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'messages': sessions[i],
        'crisis_detected': false,
        'created_at': at.toIso8601String(),
        'updated_at': at.toIso8601String(),
      });
    }
    await _client.from('ai_conversations').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Consultations — 3 completed sessions (references existing psychologists)
  // ───────────────────────────────────────────────────────────────────────────

  Future<int> _seedConsultations(String userId, DateTime now) async {
    // Consultations need a psychologist FK. Authenticated users cannot insert
    // psychologist rows (RLS), so we reference whatever already exists.
    final psychs = await _client
        .from('psychologists')
        .select('id')
        .limit(3) as List;

    if (psychs.isEmpty) {
      throw const _SkipException(
        'no psychologists in DB — seed the psychologists table first',
      );
    }
    final psychIds =
        psychs.map((p) => (p as Map)['id'] as String).toList();

    const summaries = <String>[
      'Sesi pertama: membangun rapport, memetakan pemicu kecemasan. '
          'Klien diberi latihan pernapasan dan jurnal pikiran.',
      'Sesi kedua: meninjau jurnal pikiran. Pola pikir katastrofik mulai '
          'dikenali. Diperkenalkan teknik restrukturisasi kognitif.',
      'Sesi ketiga: kemajuan baik pada kualitas tidur dan suasana hati. '
          'Fokus pada pemeliharaan kebiasaan dan pencegahan kekambuhan.',
    ];

    final rows = <Map<String, dynamic>>[];
    for (var i = 0; i < 3; i++) {
      final day = now.subtract(Duration(days: 18 - i * 7));
      final scheduled = DateTime(day.year, day.month, day.day, 16, 0);
      rows.add({
        'id': _uuid.v4(),
        'user_id': userId,
        'psychologist_id': psychIds[i % psychIds.length],
        'scheduled_at': scheduled.toIso8601String(),
        'duration_minutes': 50,
        'status': 'completed',
        'session_summary': summaries[i],
        'notes_for_patient':
            'Terus latih pernapasan harian dan catat moodmu, ya.',
        'booking_fee': 150000,
        'ended_at':
            scheduled.add(const Duration(minutes: 50)).toIso8601String(),
      });
    }
    await _client.from('consultations').insert(rows);
    return rows.length;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _run(
    DemoSeedReport report,
    String label,
    Future<int> Function() task,
  ) async {
    try {
      report.inserted[label] = await task();
    } on _SkipException catch (e) {
      report.warnings.add('$label skipped — ${e.reason}');
    } catch (e) {
      report.warnings.add('$label failed — $e');
    }
  }

  String _dateOnly(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

/// Result of a seeding run — row counts per table plus any warnings.
class DemoSeedReport {
  final Map<String, int> inserted = {};
  final List<String> warnings = [];

  int get totalRows => inserted.values.fold(0, (a, b) => a + b);
  bool get hasWarnings => warnings.isNotEmpty;

  @override
  String toString() {
    final buf = StringBuffer('DemoSeedReport — $totalRows rows\n');
    inserted.forEach((table, count) => buf.writeln('  ✓ $table: $count'));
    for (final w in warnings) {
      buf.writeln('  ⚠ $w');
    }
    return buf.toString();
  }
}

/// Internal — signals a table seed was intentionally skipped (not an error).
class _SkipException implements Exception {
  const _SkipException(this.reason);
  final String reason;
  @override
  String toString() => reason;
}
