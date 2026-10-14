import '../entities/sleep_entry_entity.dart';
import '../repositories/sleep_repository.dart';

class GetSleepEntries {
  const GetSleepEntries(this._repository);
  final SleepRepository _repository;
  Future<List<SleepEntry>> call({int limit = 30}) =>
      _repository.getEntries(limit: limit);
}
