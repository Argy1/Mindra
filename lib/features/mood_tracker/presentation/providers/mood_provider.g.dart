// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mood_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$moodRepositoryHash() => r'1d8325d24c2e6ef9a0c998b71a3af72967f7c230';

/// See also [moodRepository].
@ProviderFor(moodRepository)
final moodRepositoryProvider = AutoDisposeProvider<MoodRepositoryImpl>.internal(
  moodRepository,
  name: r'moodRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$moodRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MoodRepositoryRef = AutoDisposeProviderRef<MoodRepositoryImpl>;
String _$moodEntriesHash() => r'20f4e163d1e958ae3644eefcb525742bd8f4ea82';

/// See also [moodEntries].
@ProviderFor(moodEntries)
final moodEntriesProvider = AutoDisposeFutureProvider<List<MoodEntry>>.internal(
  moodEntries,
  name: r'moodEntriesProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$moodEntriesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MoodEntriesRef = AutoDisposeFutureProviderRef<List<MoodEntry>>;
String _$todayMoodEntryHash() => r'571ebbb1db14e106c28aba4f2127d20588096143';

/// See also [todayMoodEntry].
@ProviderFor(todayMoodEntry)
final todayMoodEntryProvider = AutoDisposeFutureProvider<MoodEntry?>.internal(
  todayMoodEntry,
  name: r'todayMoodEntryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$todayMoodEntryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef TodayMoodEntryRef = AutoDisposeFutureProviderRef<MoodEntry?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
