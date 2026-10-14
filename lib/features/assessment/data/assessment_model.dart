/// Mindra clinical assessment data — instruments standardized by WHO and
/// validated for Indonesian use. Translations sourced from the Indonesian
/// Ministry of Health (Kementerian Kesehatan RI) reference materials.
///
/// Instruments:
///   * PHQ-9  — depression screening (Patient Health Questionnaire)
///   * GAD-7  — generalized anxiety screening
///   * PSS-10 — perceived stress (Cohen et al., with reverse-scored items)
///   * SRQ-20 — WHO Self-Reporting Questionnaire (Yes/No)
library;

// ─────────────────────────────────────────────────────────────────────────────
// Assessment metadata
// ─────────────────────────────────────────────────────────────────────────────

class Assessment {
  const Assessment({
    required this.id,
    required this.title,
    required this.description,
    required this.duration,
    required this.questionCount,
    this.progress = 0.0,
    this.isDone = false,
  });

  final String id;
  final String title;
  final String description;
  final String duration;
  final int questionCount;
  final double progress;
  final bool isDone;

  factory Assessment.fromJson(Map<String, dynamic> json) => Assessment(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String? ?? '',
        duration: json['duration'] as String? ?? '10 menit',
        questionCount: json['question_count'] as int? ?? 10,
        progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
        isDone: json['is_done'] as bool? ?? false,
      );

  static List<Assessment> get seeds => const [
        Assessment(
          id: 'phq9',
          title: 'Skala Depresi PHQ-9',
          description:
              'Mengukur gejala depresi selama dua minggu terakhir. Digunakan luas oleh profesional kesehatan jiwa dan tervalidasi di Indonesia.',
          duration: '5–10 menit',
          questionCount: 9,
        ),
        Assessment(
          id: 'gad7',
          title: 'Skala Kecemasan GAD-7',
          description:
              'Mengidentifikasi tingkat kecemasan umum. Digunakan di fasilitas kesehatan primer.',
          duration: '5 menit',
          questionCount: 7,
        ),
        Assessment(
          id: 'pss10',
          title: 'Skala Stres PSS-10',
          description:
              'Mengukur tingkat stres yang dirasakan dalam sebulan terakhir (Perceived Stress Scale, Cohen).',
          duration: '5 menit',
          questionCount: 10,
        ),
        Assessment(
          id: 'srq20',
          title: 'Skrining SRQ-20 (WHO)',
          description:
              'Skrining gangguan jiwa umum oleh WHO, direkomendasikan Kementerian Kesehatan RI untuk layanan primer.',
          duration: '5–7 menit',
          questionCount: 20,
        ),
      ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Question + Option models
// ─────────────────────────────────────────────────────────────────────────────

class Question {
  const Question({
    required this.id,
    required this.assessmentId,
    required this.order,
    required this.text,
    required this.options,
    this.isReverseScored = false,
  });

  final String id;
  final String assessmentId;
  final int order;
  final String text;
  final List<QuestionOption> options;

  /// True for PSS-10 items 4, 5, 7, 8. Scoring applies (maxOption - raw).
  final bool isReverseScored;

  factory Question.fromJson(Map<String, dynamic> json) => Question(
        id: json['id'] as String,
        assessmentId: json['assessment_id'] as String,
        order: json['order'] as int,
        text: json['text'] as String,
        options: (json['options'] as List)
            .map((e) => QuestionOption.fromJson(e as Map<String, dynamic>))
            .toList(),
        isReverseScored: json['is_reverse_scored'] as bool? ?? false,
      );

  /// Maximum option value for this question (used for reverse scoring).
  int get maxOptionValue =>
      options.map((o) => o.value).reduce((a, b) => a > b ? a : b);

  static List<Question> seedsFor(String assessmentId) {
    return switch (assessmentId) {
      'phq9'  => _phq9Questions,
      'gad7'  => _gad7Questions,
      'pss10' => _pss10Questions,
      'srq20' => _srq20Questions,
      _       => _genericQuestions(assessmentId),
    };
  }
}

class QuestionOption {
  const QuestionOption({required this.label, required this.value});

  final String label;
  final int value;

  factory QuestionOption.fromJson(Map<String, dynamic> json) => QuestionOption(
        label: json['label'] as String,
        value: json['value'] as int,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Option presets
// ─────────────────────────────────────────────────────────────────────────────

/// PHQ-9 & GAD-7 — 4-point frequency (0–3).
const _phqOptions = [
  QuestionOption(label: 'Sama sekali tidak',        value: 0),
  QuestionOption(label: 'Beberapa hari',            value: 1),
  QuestionOption(label: 'Lebih dari separuh hari',  value: 2),
  QuestionOption(label: 'Hampir setiap hari',       value: 3),
];

/// PSS-10 — 5-point frequency (0–4).
const _pssOptions = [
  QuestionOption(label: 'Tidak pernah',         value: 0),
  QuestionOption(label: 'Hampir tidak pernah',  value: 1),
  QuestionOption(label: 'Kadang-kadang',        value: 2),
  QuestionOption(label: 'Cukup sering',         value: 3),
  QuestionOption(label: 'Sangat sering',        value: 4),
];

/// SRQ-20 — binary (0/1).
const _yaTidakOptions = [
  QuestionOption(label: 'Tidak',  value: 0),
  QuestionOption(label: 'Ya',     value: 1),
];

// ─────────────────────────────────────────────────────────────────────────────
// PHQ-9 — Patient Health Questionnaire-9
// ─────────────────────────────────────────────────────────────────────────────

const _phq9Questions = [
  Question(
    id: 'phq9_1', assessmentId: 'phq9', order: 1,
    text: 'Kurang tertarik atau tidak ada kesenangan dalam melakukan sesuatu',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_2', assessmentId: 'phq9', order: 2,
    text: 'Merasa sedih, murung, atau tidak ada harapan',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_3', assessmentId: 'phq9', order: 3,
    text: 'Sulit tidur atau terlalu banyak tidur',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_4', assessmentId: 'phq9', order: 4,
    text: 'Merasa lelah atau kurang energi',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_5', assessmentId: 'phq9', order: 5,
    text: 'Nafsu makan berkurang atau makan berlebihan',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_6', assessmentId: 'phq9', order: 6,
    text:
        'Merasa buruk tentang diri sendiri — atau merasa gagal atau mengecewakan diri sendiri maupun keluarga',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_7', assessmentId: 'phq9', order: 7,
    text:
        'Sulit berkonsentrasi pada sesuatu, seperti membaca koran atau menonton televisi',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_8', assessmentId: 'phq9', order: 8,
    text:
        'Bergerak atau berbicara terlalu lambat sehingga orang lain memperhatikannya — atau sebaliknya, sangat gelisah sehingga kamu bergerak lebih banyak dari biasanya',
    options: _phqOptions,
  ),
  Question(
    id: 'phq9_9', assessmentId: 'phq9', order: 9,
    text:
        'Pikiran bahwa lebih baik mati, atau pikiran untuk menyakiti diri sendiri',
    options: _phqOptions,
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// GAD-7 — Generalized Anxiety Disorder
// ─────────────────────────────────────────────────────────────────────────────

const _gad7Questions = [
  Question(
    id: 'gad7_1', assessmentId: 'gad7', order: 1,
    text: 'Merasa gugup, cemas, atau tegang',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_2', assessmentId: 'gad7', order: 2,
    text: 'Tidak bisa berhenti atau mengendalikan kekhawatiran',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_3', assessmentId: 'gad7', order: 3,
    text: 'Terlalu banyak khawatir tentang berbagai hal',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_4', assessmentId: 'gad7', order: 4,
    text: 'Sulit untuk rileks',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_5', assessmentId: 'gad7', order: 5,
    text: 'Sangat gelisah sehingga sulit untuk duduk diam',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_6', assessmentId: 'gad7', order: 6,
    text: 'Mudah tersinggung atau mudah marah',
    options: _phqOptions,
  ),
  Question(
    id: 'gad7_7', assessmentId: 'gad7', order: 7,
    text: 'Merasa seolah-olah akan terjadi sesuatu yang buruk',
    options: _phqOptions,
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// PSS-10 — Perceived Stress Scale (Cohen)
// Items 4, 5, 7, 8 are reverse-scored.
// ─────────────────────────────────────────────────────────────────────────────

const _pss10Questions = [
  Question(
    id: 'pss10_1', assessmentId: 'pss10', order: 1,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa kesal karena sesuatu yang terjadi secara tak terduga?',
    options: _pssOptions,
  ),
  Question(
    id: 'pss10_2', assessmentId: 'pss10', order: 2,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa tidak mampu mengendalikan hal-hal penting dalam hidupmu?',
    options: _pssOptions,
  ),
  Question(
    id: 'pss10_3', assessmentId: 'pss10', order: 3,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa gugup atau tertekan?',
    options: _pssOptions,
  ),
  Question(
    id: 'pss10_4', assessmentId: 'pss10', order: 4,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa yakin dengan kemampuanmu menangani masalah pribadi?',
    options: _pssOptions,
    isReverseScored: true,
  ),
  Question(
    id: 'pss10_5', assessmentId: 'pss10', order: 5,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa segala sesuatu berjalan sesuai keinginanmu?',
    options: _pssOptions,
    isReverseScored: true,
  ),
  Question(
    id: 'pss10_6', assessmentId: 'pss10', order: 6,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa tidak mampu mengatasi semua hal yang harus dikerjakan?',
    options: _pssOptions,
  ),
  Question(
    id: 'pss10_7', assessmentId: 'pss10', order: 7,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu mampu mengendalikan rasa kesal dalam hidupmu?',
    options: _pssOptions,
    isReverseScored: true,
  ),
  Question(
    id: 'pss10_8', assessmentId: 'pss10', order: 8,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa mampu mengelola hal-hal dengan baik?',
    options: _pssOptions,
    isReverseScored: true,
  ),
  Question(
    id: 'pss10_9', assessmentId: 'pss10', order: 9,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu marah karena hal-hal yang berada di luar kendalimu?',
    options: _pssOptions,
  ),
  Question(
    id: 'pss10_10', assessmentId: 'pss10', order: 10,
    text:
        'Dalam sebulan terakhir, seberapa sering kamu merasa kesulitan menumpuk begitu tinggi sehingga sulit diatasi?',
    options: _pssOptions,
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// SRQ-20 — Self-Reporting Questionnaire (WHO)
// Indonesian translation per Kementerian Kesehatan RI (Riskesdas).
// ─────────────────────────────────────────────────────────────────────────────

const _srq20Questions = [
  Question(
    id: 'srq20_1',  assessmentId: 'srq20', order: 1,
    text: 'Apakah kamu sering merasa sakit kepala?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_2',  assessmentId: 'srq20', order: 2,
    text: 'Apakah kamu kehilangan nafsu makan?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_3',  assessmentId: 'srq20', order: 3,
    text: 'Apakah tidurmu tidak nyenyak?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_4',  assessmentId: 'srq20', order: 4,
    text: 'Apakah kamu mudah merasa takut?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_5',  assessmentId: 'srq20', order: 5,
    text: 'Apakah kamu merasa cemas, tegang, atau khawatir?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_6',  assessmentId: 'srq20', order: 6,
    text: 'Apakah tanganmu gemetar?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_7',  assessmentId: 'srq20', order: 7,
    text: 'Apakah kamu mengalami gangguan pencernaan?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_8',  assessmentId: 'srq20', order: 8,
    text: 'Apakah kamu kesulitan untuk berpikir jernih?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_9',  assessmentId: 'srq20', order: 9,
    text: 'Apakah kamu merasa tidak bahagia?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_10', assessmentId: 'srq20', order: 10,
    text: 'Apakah kamu menangis lebih sering dari biasanya?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_11', assessmentId: 'srq20', order: 11,
    text: 'Apakah kamu merasa sulit untuk menikmati kegiatan sehari-hari?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_12', assessmentId: 'srq20', order: 12,
    text: 'Apakah kamu kesulitan untuk mengambil keputusan?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_13', assessmentId: 'srq20', order: 13,
    text: 'Apakah pekerjaan atau aktivitas sehari-harimu terganggu?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_14', assessmentId: 'srq20', order: 14,
    text: 'Apakah kamu merasa tidak mampu memainkan peran yang berguna dalam hidup?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_15', assessmentId: 'srq20', order: 15,
    text: 'Apakah kamu kehilangan minat pada banyak hal?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_16', assessmentId: 'srq20', order: 16,
    text: 'Apakah kamu merasa tidak berharga?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_17', assessmentId: 'srq20', order: 17,
    text: 'Apakah kamu pernah mempunyai pikiran untuk mengakhiri hidup?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_18', assessmentId: 'srq20', order: 18,
    text: 'Apakah kamu merasa lelah sepanjang waktu?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_19', assessmentId: 'srq20', order: 19,
    text: 'Apakah kamu mengalami rasa tidak enak di perut?',
    options: _yaTidakOptions,
  ),
  Question(
    id: 'srq20_20', assessmentId: 'srq20', order: 20,
    text: 'Apakah kamu mudah merasa lelah?',
    options: _yaTidakOptions,
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Fallback for unknown instruments — should never be used in production.
// ─────────────────────────────────────────────────────────────────────────────

List<Question> _genericQuestions(String assessmentId) => List.generate(
      5,
      (i) => Question(
        id: '${assessmentId}_${i + 1}',
        assessmentId: assessmentId,
        order: i + 1,
        text:
            'Pertanyaan ${i + 1}: Dalam sebulan terakhir, seberapa sering kamu mengalami hal berikut?',
        options: _phqOptions,
      ),
    );
