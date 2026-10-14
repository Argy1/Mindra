import '../../domain/entities/exercise_entity.dart';

class CbtExerciseModel extends CbtExercise {
  const CbtExerciseModel({
    required super.id,
    required super.title,
    required super.description,
    required super.category,
    required super.durationMinutes,
    required super.steps,
  });

  factory CbtExerciseModel.fromJson(Map<String, dynamic> j) => CbtExerciseModel(
        id: j['id'] as String,
        title: j['title'] as String,
        description: j['description'] as String,
        category: ExerciseCategory.values.firstWhere(
          (e) => e.name == j['category'],
          orElse: () => ExerciseCategory.mindfulness,
        ),
        durationMinutes: j['duration_minutes'] as int? ?? 10,
        steps: (j['steps'] as List?)?.cast<String>() ?? [],
      );

  static List<CbtExerciseModel> get seeds => const [
        CbtExerciseModel(
          id: 'thought-record',
          title: 'Catatan Pikiran',
          description: 'Identifikasi dan tantang pikiran negatif secara terstruktur.',
          category: ExerciseCategory.thoughtRecord,
          durationMinutes: 15,
          steps: [
            'Tuliskan situasi yang membuatmu merasa tidak nyaman.',
            'Apa pikiran otomatis yang muncul?',
            'Apa perasaan yang kamu rasakan? (0-100%)',
            'Apa bukti yang mendukung pikiran tersebut?',
            'Apa bukti yang bertentangan?',
            'Apa pikiran alternatif yang lebih seimbang?',
            'Bagaimana perasaanmu sekarang? (0-100%)',
          ],
        ),
        CbtExerciseModel(
          id: 'breathing-4-7-8',
          title: 'Teknik Napas 4-7-8',
          description: 'Teknik pernapasan untuk meredakan kecemasan secara cepat.',
          category: ExerciseCategory.relaxation,
          durationMinutes: 5,
          steps: [
            'Duduk nyaman dan tutup mata.',
            'Hirup napas perlahan selama 4 detik.',
            'Tahan napas selama 7 detik.',
            'Hembuskan perlahan selama 8 detik.',
            'Ulangi 4 kali.',
          ],
        ),
      ];
}
