import 'dart:convert';

import '../../domain/entities/reflection_entity.dart';

class NightReflectionModel extends NightReflection {
  const NightReflectionModel({
    required super.id,
    required super.userId,
    required super.date,
    required super.answers,
    required super.createdAt,
    super.moodAfter,
  });

  factory NightReflectionModel.fromJson(Map<String, dynamic> j) {
    final rawAnswers = j['answers'];
    List<ReflectionAnswer> answers = [];
    if (rawAnswers is List) {
      answers = rawAnswers
          .whereType<Map<String, dynamic>>()
          .map(ReflectionAnswer.fromJson)
          .toList();
    } else if (rawAnswers is String) {
      final decoded = jsonDecode(rawAnswers) as List<dynamic>;
      answers = decoded
          .whereType<Map<String, dynamic>>()
          .map(ReflectionAnswer.fromJson)
          .toList();
    }
    return NightReflectionModel(
      id: j['id'] as String,
      userId: j['user_id'] as String,
      date: DateTime.parse(j['date'] as String),
      answers: answers,
      createdAt: DateTime.parse(j['created_at'] as String),
      moodAfter: j['mood_after'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'date': '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
        'answers': answers.map((a) => a.toJson()).toList(),
        'mood_after': moodAfter,
        'created_at': createdAt.toIso8601String(),
      };
}
