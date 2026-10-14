import '../../domain/entities/mood_entry_entity.dart';
import '../../domain/repositories/mood_repository.dart';
import '../datasources/mood_remote_datasource.dart';
import '../models/mood_entry_model.dart';

class MoodRepositoryImpl implements MoodRepository {
  const MoodRepositoryImpl(this._datasource);
  final MoodRemoteDatasource _datasource;

  @override
  Future<List<MoodEntry>> getEntries({int limit = 30}) =>
      _datasource.getEntries(limit: limit);

  @override
  Future<List<MoodEntry>> getEntriesByRange(DateTime from, DateTime to) =>
      _datasource.getEntriesByRange(from, to);

  @override
  Future<MoodEntry?> getTodayEntry() async {
    final entries = await _datasource.getEntries(limit: 1);
    if (entries.isEmpty) return null;
    final e = entries.first;
    final now = DateTime.now();
    return e.createdAt.year == now.year &&
            e.createdAt.month == now.month &&
            e.createdAt.day == now.day
        ? e
        : null;
  }

  @override
  Future<void> saveEntry(MoodEntry entry) => _datasource.saveEntry(
        MoodEntryModel(
          id: entry.id,
          userId: entry.userId,
          moodType: entry.moodType,
          note: entry.note,
          createdAt: entry.createdAt,
          energyLevel: entry.energyLevel,
          triggers: entry.triggers,
        ),
      );

  @override
  Future<void> deleteEntry(String id) => _datasource.deleteEntry(id);

  @override
  Stream<List<MoodEntry>> watchRecentEntries(int days) => Stream.fromFuture(
        _datasource.getEntries(limit: days),
      );
}
