import '../entities/mood_entry_entity.dart';
import '../repositories/mood_repository.dart';

class SaveMoodEntry {
  const SaveMoodEntry(this._repository);
  final MoodRepository _repository;
  Future<void> call(MoodEntry entry) => _repository.saveEntry(entry);
}
