// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'home_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$userProfileHash() => r'717af4fcd5cf4723270670120adc145352b93cc7';

/// See also [userProfile].
@ProviderFor(userProfile)
final userProfileProvider = AutoDisposeFutureProvider<UserProfile>.internal(
  userProfile,
  name: r'userProfileProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$userProfileHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef UserProfileRef = AutoDisposeFutureProviderRef<UserProfile>;
String _$todayPracticesHash() => r'69c97279e4c1f347ad4cb83c21c8b2a72e665adf';

/// See also [todayPractices].
@ProviderFor(todayPractices)
final todayPracticesProvider = AutoDisposeProvider<List<PracticeItem>>.internal(
  todayPractices,
  name: r'todayPracticesProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$todayPracticesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef TodayPracticesRef = AutoDisposeProviderRef<List<PracticeItem>>;
String _$todayMoodHash() => r'b0da2364f6d4be99feba14d332e648e049e4a0d4';

/// See also [TodayMood].
@ProviderFor(TodayMood)
final todayMoodProvider =
    AutoDisposeNotifierProvider<TodayMood, MoodType?>.internal(
  TodayMood.new,
  name: r'todayMoodProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$todayMoodHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$TodayMood = AutoDisposeNotifier<MoodType?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
