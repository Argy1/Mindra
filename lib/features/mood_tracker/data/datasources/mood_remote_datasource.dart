import '../models/mood_entry_model.dart';

abstract class MoodRemoteDatasource {
  Future<List<MoodEntryModel>> getEntries({int limit = 30});
  Future<List<MoodEntryModel>> getEntriesByRange(DateTime from, DateTime to);
  Future<void> saveEntry(MoodEntryModel entry);
  Future<void> deleteEntry(String id);
}

class MoodRemoteDatasourceImpl implements MoodRemoteDatasource {
  const MoodRemoteDatasourceImpl(this._client);
  final dynamic _client;

  @override
  Future<List<MoodEntryModel>> getEntries({int limit = 30}) async {
    final data = await _client
        .from('mood_entries')
        .select()
        .order('created_at', ascending: false)
        .limit(limit) as List;
    return data
        .map((e) => MoodEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<MoodEntryModel>> getEntriesByRange(
    DateTime from,
    DateTime to,
  ) async {
    final data = await _client
        .from('mood_entries')
        .select()
        .gte('created_at', from.toIso8601String())
        .lte('created_at', to.toIso8601String())
        .order('created_at', ascending: false) as List;
    return data
        .map((e) => MoodEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> saveEntry(MoodEntryModel entry) async {
    await _client.from('mood_entries').upsert(entry.toJson());
  }

  @override
  Future<void> deleteEntry(String id) async {
    await _client.from('mood_entries').delete().eq('id', id);
  }
}
