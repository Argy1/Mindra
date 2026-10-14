import '../entities/reflection_entity.dart';

abstract class ReflectionRepository {
  Future<List<NightReflection>> getReflections({int limit = 30});
  Future<NightReflection?> getTodayReflection();
  Future<void> saveReflection(NightReflection reflection);
}
