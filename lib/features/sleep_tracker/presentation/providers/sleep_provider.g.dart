// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sleep_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$sleepRepositoryHash() => r'b2ede5871accf9f3fcafb4a9d1486e6b78c856ce';

/// See also [sleepRepository].
@ProviderFor(sleepRepository)
final sleepRepositoryProvider =
    AutoDisposeProvider<SleepRepositoryImpl>.internal(
  sleepRepository,
  name: r'sleepRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$sleepRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SleepRepositoryRef = AutoDisposeProviderRef<SleepRepositoryImpl>;
String _$sleepEntriesHash() => r'c3f250f32acd455e332adfafdbded3f9760b4aab';

/// See also [sleepEntries].
@ProviderFor(sleepEntries)
final sleepEntriesProvider =
    AutoDisposeFutureProvider<List<SleepEntry>>.internal(
  sleepEntries,
  name: r'sleepEntriesProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$sleepEntriesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SleepEntriesRef = AutoDisposeFutureProviderRef<List<SleepEntry>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
