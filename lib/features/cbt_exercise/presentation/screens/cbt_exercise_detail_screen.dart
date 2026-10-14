import 'package:flutter/material.dart';
import '../../domain/entities/exercise_entity.dart';
import 'behavioral_activation_screen.dart';
import 'guided_breathing_screen.dart';
import 'pmr_screen.dart';
import 'thought_record_screen.dart';

class CbtExerciseDetailScreen extends StatelessWidget {
  const CbtExerciseDetailScreen({super.key, required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final exerciseType = CbtExerciseTypeX.fromId(type);
    return switch (exerciseType) {
      CbtExerciseType.thoughtRecord => const ThoughtRecordScreen(),
      CbtExerciseType.behavioralActivation => const BehavioralActivationScreen(),
      CbtExerciseType.pmr => const PmrScreen(),
      CbtExerciseType.guidedBreathing => const GuidedBreathingScreen(),
    };
  }

}
