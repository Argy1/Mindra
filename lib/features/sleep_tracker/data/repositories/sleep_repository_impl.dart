import '../../domain/entities/sleep_entry_entity.dart';
import '../../domain/repositories/sleep_repository.dart';
import '../datasources/sleep_remote_datasource.dart';
import '../models/sleep_entry_model.dart';

class SleepRepositoryImpl implements SleepRepository {
  const SleepRepositoryImpl(this._datasource);
  final SleepRemoteDatasource _datasource;

  @override
  Future<List<SleepEntry>> getEntries({int limit = 30}) =>
      _datasource.getEntries(limit: limit);

  @override
  Future<List<SleepEntry>> getEntriesByRange(DateTime from, DateTime to) =>
      _datasource.getEntriesByRange(from, to);

  @override
  Future<SleepEntry?> getTodayEntry() async {
    final entries = await _datasource.getEntries(limit: 1);
    if (entries.isEmpty) return null;
    final e = entries.first;
    final now = DateTime.now();
    return e.wakeTime.year == now.year &&
            e.wakeTime.month == now.month &&
            e.wakeTime.day == now.day
        ? e
        : null;
  }

  @override
  Future<void> saveEntry(SleepEntry entry) => _datasource.saveEntry(
        SleepEntryModel(
          id: entry.id,
          userId: entry.userId,
          bedtime: entry.bedtime,
          wakeTime: entry.wakeTime,
          quality: entry.quality,
          notes: entry.notes,
        ),
      );

  @override
  Future<void> deleteEntry(String id) => _datasource.deleteEntry(id);
}
