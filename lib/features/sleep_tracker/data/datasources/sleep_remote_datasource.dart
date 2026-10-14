import '../models/sleep_entry_model.dart';

abstract class SleepRemoteDatasource {
  Future<List<SleepEntryModel>> getEntries({int limit = 30});
  Future<List<SleepEntryModel>> getEntriesByRange(DateTime from, DateTime to);
  Future<void> saveEntry(SleepEntryModel entry);
  Future<void> deleteEntry(String id);
}

class SleepRemoteDatasourceImpl implements SleepRemoteDatasource {
  const SleepRemoteDatasourceImpl(this._client);
  final dynamic _client;

  @override
  Future<List<SleepEntryModel>> getEntries({int limit = 30}) async {
    final data = await _client
        .from('sleep_entries')
        .select()
        .order('bedtime', ascending: false)
        .limit(limit) as List;
    return data
        .map((e) => SleepEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<SleepEntryModel>> getEntriesByRange(
    DateTime from,
    DateTime to,
  ) async {
    final data = await _client
        .from('sleep_entries')
        .select()
        .gte('bedtime', from.toIso8601String())
        .lte('bedtime', to.toIso8601String())
        .order('bedtime', ascending: false) as List;
    return data
        .map((e) => SleepEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> saveEntry(SleepEntryModel entry) async =>
      _client.from('sleep_entries').upsert(entry.toJson());

  @override
  Future<void> deleteEntry(String id) async =>
      _client.from('sleep_entries').delete().eq('id', id);
}
