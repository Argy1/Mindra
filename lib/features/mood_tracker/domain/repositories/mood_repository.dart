import '../entities/mood_entry_entity.dart';

abstract class MoodRepository {
  Future<List<MoodEntry>> getEntries({int limit = 30});
  Future<List<MoodEntry>> getEntriesByRange(DateTime from, DateTime to);
  Future<MoodEntry?> getTodayEntry();
  Future<void> saveEntry(MoodEntry entry);
  Future<void> deleteEntry(String id);
  Stream<List<MoodEntry>> watchRecentEntries(int days);
}
