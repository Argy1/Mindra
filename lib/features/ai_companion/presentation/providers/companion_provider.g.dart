// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'companion_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$companionRepositoryHash() =>
    r'65c82a9dc904a4e32ad030bf2672ac1dfbec0941';

/// See also [companionRepository].
@ProviderFor(companionRepository)
final companionRepositoryProvider =
    AutoDisposeProvider<CompanionRepositoryImpl>.internal(
  companionRepository,
  name: r'companionRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$companionRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef CompanionRepositoryRef
    = AutoDisposeProviderRef<CompanionRepositoryImpl>;
String _$companionSessionHash() => r'a162192561f9d03442f40edb52eab99194ee3c85';

/// See also [CompanionSession].
@ProviderFor(CompanionSession)
final companionSessionProvider =
    AutoDisposeNotifierProvider<CompanionSession, List<ChatMessage>>.internal(
  CompanionSession.new,
  name: r'companionSessionProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$companionSessionHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$CompanionSession = AutoDisposeNotifier<List<ChatMessage>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
