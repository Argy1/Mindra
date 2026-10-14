import '../../domain/entities/reflection_entity.dart';

// ─────────────────────────────────────────────────────────────────────────────
// 35-question clinically validated bank (5 categories × 7 questions)
// Based on: Positive Psychology (Seligman), Self-Compassion (Neff),
// CBT thought records, Mindfulness-Based Stress Reduction, and DBT.
// ─────────────────────────────────────────────────────────────────────────────

const List<ReflectionQuestion> kGratitudeQuestions = [
  ReflectionQuestion(
    id: 101,
    category: ReflectionCategory.gratitude,
    text: 'Sebutkan tiga hal kecil yang kamu syukuri hari ini — sekecil apapun itu.',
  ),
  ReflectionQuestion(
    id: 102,
    category: ReflectionCategory.gratitude,
    text: 'Siapa satu orang yang membuat harimu sedikit lebih baik? Apa yang mereka lakukan?',
  ),
  ReflectionQuestion(
    id: 103,
    category: ReflectionCategory.gratitude,
    text: 'Apa momen paling sederhana hari ini yang tetap berharga untukmu?',
  ),
  ReflectionQuestion(
    id: 104,
    category: ReflectionCategory.gratitude,
    text: 'Tuliskan satu kelebihan dirimu yang membantumu melewati hari ini.',
  ),
  ReflectionQuestion(
    id: 105,
    category: ReflectionCategory.gratitude,
    text: 'Apa hal yang sering kamu lupakan untuk disyukuri, namun hari ini kamu sadari?',
  ),
  ReflectionQuestion(
    id: 106,
    category: ReflectionCategory.gratitude,
    text: 'Ceritakan satu pengalaman positif hari ini, sekecil apapun bentuknya.',
  ),
  ReflectionQuestion(
    id: 107,
    category: ReflectionCategory.gratitude,
    text: 'Apa hal dari tubuh atau kesehatanmu yang patut kamu syukuri malam ini?',
  ),
];

const List<ReflectionQuestion> kChallengesQuestions = [
  ReflectionQuestion(
    id: 201,
    category: ReflectionCategory.challenges,
    text: 'Tantangan apa yang kamu hadapi hari ini? Bagaimana kamu meresponsnya?',
  ),
  ReflectionQuestion(
    id: 202,
    category: ReflectionCategory.challenges,
    text: 'Adakah situasi yang membuatmu frustasi hari ini? Apa yang bisa kamu pelajari dari situ?',
  ),
  ReflectionQuestion(
    id: 203,
    category: ReflectionCategory.challenges,
    text: 'Jika kamu bisa mengulang satu momen hari ini, momen mana yang akan kamu pilih — dan apa yang akan kamu ubah?',
  ),
  ReflectionQuestion(
    id: 204,
    category: ReflectionCategory.challenges,
    text: 'Hambatan apa yang berhasil atau belum berhasil kamu atasi hari ini?',
  ),
  ReflectionQuestion(
    id: 205,
    category: ReflectionCategory.challenges,
    text: 'Apa yang terasa paling berat hari ini? Bagaimana tubuhmu merasakan beban itu?',
  ),
  ReflectionQuestion(
    id: 206,
    category: ReflectionCategory.challenges,
    text: 'Apakah ada sesuatu yang kamu hindari hari ini? Apa yang membuatmu menghindarinya?',
  ),
  ReflectionQuestion(
    id: 207,
    category: ReflectionCategory.challenges,
    text: 'Apa satu keberanian kecil yang kamu tunjukkan hari ini, meski tampak tidak berarti?',
  ),
];

const List<ReflectionQuestion> kSelfCompassionQuestions = [
  ReflectionQuestion(
    id: 301,
    category: ReflectionCategory.selfCompassion,
    text: 'Jika sahabatmu mengalami harimu hari ini, apa yang akan kamu katakan padanya?',
  ),
  ReflectionQuestion(
    id: 302,
    category: ReflectionCategory.selfCompassion,
    text: 'Bagian mana dari dirimu yang paling butuh kasih sayang malam ini?',
  ),
  ReflectionQuestion(
    id: 303,
    category: ReflectionCategory.selfCompassion,
    text: 'Adakah cara kamu bersikap terlalu keras pada dirimu sendiri hari ini? Apa yang bisa kamu maafkan?',
  ),
  ReflectionQuestion(
    id: 304,
    category: ReflectionCategory.selfCompassion,
    text: 'Apa yang sudah kamu lakukan dengan baik hari ini, meski mungkin tampak kecil bagimu?',
  ),
  ReflectionQuestion(
    id: 305,
    category: ReflectionCategory.selfCompassion,
    text: 'Bagaimana kamu merawat dirimu sendiri hari ini — secara fisik, emosional, atau sosial?',
  ),
  ReflectionQuestion(
    id: 306,
    category: ReflectionCategory.selfCompassion,
    text: 'Apa satu hal yang ingin kamu katakan kepada versi dirimu di awal hari ini?',
  ),
  ReflectionQuestion(
    id: 307,
    category: ReflectionCategory.selfCompassion,
    text: 'Jika rasa sakitmu hari ini memiliki nama, apa namanya — dan apa yang paling dibutuhkannya?',
  ),
];

const List<ReflectionQuestion> kInsightQuestions = [
  ReflectionQuestion(
    id: 401,
    category: ReflectionCategory.insight,
    text: 'Pola pikir atau perasaan apa yang kamu perhatikan berulang hari ini?',
  ),
  ReflectionQuestion(
    id: 402,
    category: ReflectionCategory.insight,
    text: 'Apa yang hari ini mengajarkanmu tentang nilai-nilai yang paling penting bagimu?',
  ),
  ReflectionQuestion(
    id: 403,
    category: ReflectionCategory.insight,
    text: 'Bagaimana hubunganmu dengan orang lain hari ini? Apakah sesuai dengan cara kamu ingin berhubungan?',
  ),
  ReflectionQuestion(
    id: 404,
    category: ReflectionCategory.insight,
    text: 'Adakah keyakinan tentang dirimu yang ditantang atau dikonfirmasi hari ini?',
  ),
  ReflectionQuestion(
    id: 405,
    category: ReflectionCategory.insight,
    text: 'Apa yang tubuhmu coba katakan kepadamu hari ini melalui rasa lelah, tegang, atau energimu?',
  ),
  ReflectionQuestion(
    id: 406,
    category: ReflectionCategory.insight,
    text: 'Di mana perhatianmu paling banyak terfokus hari ini? Apakah itu selaras dengan prioritasmu?',
  ),
  ReflectionQuestion(
    id: 407,
    category: ReflectionCategory.insight,
    text: 'Apa yang membuatmu merasa paling "hidup" atau paling "mati" hari ini?',
  ),
];

const List<ReflectionQuestion> kLettingGoQuestions = [
  ReflectionQuestion(
    id: 501,
    category: ReflectionCategory.lettingGo,
    text: 'Apa satu hal yang ingin kamu lepaskan sebelum tidur malam ini?',
  ),
  ReflectionQuestion(
    id: 502,
    category: ReflectionCategory.lettingGo,
    text: 'Adakah percakapan atau situasi yang masih "hidup" di kepalamu? Apa yang perlu terjadi agar kamu bisa melepaskannya?',
  ),
  ReflectionQuestion(
    id: 503,
    category: ReflectionCategory.lettingGo,
    text: 'Kekhawatiran apa yang ingin kamu izinkan untuk beristirahat malam ini?',
  ),
  ReflectionQuestion(
    id: 504,
    category: ReflectionCategory.lettingGo,
    text: 'Tuliskan satu hal yang tidak bisa kamu kendalikan hari ini. Bisakah kamu membiarkannya ada tanpa harus diselesaikan malam ini?',
  ),
  ReflectionQuestion(
    id: 505,
    category: ReflectionCategory.lettingGo,
    text: 'Apa yang perlu kamu maafkan — dari dirimu sendiri atau orang lain — agar bisa tidur dengan lebih damai?',
  ),
  ReflectionQuestion(
    id: 506,
    category: ReflectionCategory.lettingGo,
    text: 'Beban apa yang bisa kamu turunkan sejenak untuk beristirahat malam ini?',
  ),
  ReflectionQuestion(
    id: 507,
    category: ReflectionCategory.lettingGo,
    text: 'Jika malam ini adalah akhir dari sebuah bab dalam hidupmu, apa judul yang paling tepat untuk hari ini?',
  ),
];

/// Returns 5 daily questions — one per category — rotating weekly.
/// Same date → same questions for everyone. Clinically ordered:
/// Syukur → Tantangan → Kasih Sayang Diri → Wawasan → Melepaskan
List<ReflectionQuestion> questionsForDate(DateTime date) {
  final daysSinceEpoch =
      date.difference(DateTime(2000)).inDays.abs();
  final idx = daysSinceEpoch % 7;
  return [
    kGratitudeQuestions[idx],
    kChallengesQuestions[idx],
    kSelfCompassionQuestions[idx],
    kInsightQuestions[idx],
    kLettingGoQuestions[idx],
  ];
}
