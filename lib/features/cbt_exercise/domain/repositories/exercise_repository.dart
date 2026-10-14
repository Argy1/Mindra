import '../entities/exercise_entity.dart';

abstract class ExerciseRepository {
  Future<List<CbtExercise>> getExercises();
  Future<CbtExercise?> getExercise(String id);
  Future<void> markCompleted(String exerciseId, String userId);
}
