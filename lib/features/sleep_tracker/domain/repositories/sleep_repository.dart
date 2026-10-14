import '../entities/sleep_entry_entity.dart';

abstract class SleepRepository {
  Future<List<SleepEntry>> getEntries({int limit = 30});
  Future<List<SleepEntry>> getEntriesByRange(DateTime from, DateTime to);
  Future<SleepEntry?> getTodayEntry();
  Future<void> saveEntry(SleepEntry entry);
  Future<void> deleteEntry(String id);
}
