// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'assessment_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$assessmentListHash() => r'8f01cbe79bada74eb88726ceb36b8258a637ebde';

/// See also [assessmentList].
@ProviderFor(assessmentList)
final assessmentListProvider =
    AutoDisposeFutureProvider<List<Assessment>>.internal(
  assessmentList,
  name: r'assessmentListProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$assessmentListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AssessmentListRef = AutoDisposeFutureProviderRef<List<Assessment>>;
String _$assessmentDetailHash() => r'34ae7b8cf5abc85755a064547aebff15bf212e9e';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// See also [assessmentDetail].
@ProviderFor(assessmentDetail)
const assessmentDetailProvider = AssessmentDetailFamily();

/// See also [assessmentDetail].
class AssessmentDetailFamily extends Family<AsyncValue<Assessment?>> {
  /// See also [assessmentDetail].
  const AssessmentDetailFamily();

  /// See also [assessmentDetail].
  AssessmentDetailProvider call(
    String id,
  ) {
    return AssessmentDetailProvider(
      id,
    );
  }

  @override
  AssessmentDetailProvider getProviderOverride(
    covariant AssessmentDetailProvider provider,
  ) {
    return call(
      provider.id,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'assessmentDetailProvider';
}

/// See also [assessmentDetail].
class AssessmentDetailProvider extends AutoDisposeFutureProvider<Assessment?> {
  /// See also [assessmentDetail].
  AssessmentDetailProvider(
    String id,
  ) : this._internal(
          (ref) => assessmentDetail(
            ref as AssessmentDetailRef,
            id,
          ),
          from: assessmentDetailProvider,
          name: r'assessmentDetailProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$assessmentDetailHash,
          dependencies: AssessmentDetailFamily._dependencies,
          allTransitiveDependencies:
              AssessmentDetailFamily._allTransitiveDependencies,
          id: id,
        );

  AssessmentDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.id,
  }) : super.internal();

  final String id;

  @override
  Override overrideWith(
    FutureOr<Assessment?> Function(AssessmentDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AssessmentDetailProvider._internal(
        (ref) => create(ref as AssessmentDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        id: id,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<Assessment?> createElement() {
    return _AssessmentDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AssessmentDetailProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AssessmentDetailRef on AutoDisposeFutureProviderRef<Assessment?> {
  /// The parameter `id` of this provider.
  String get id;
}

class _AssessmentDetailProviderElement
    extends AutoDisposeFutureProviderElement<Assessment?>
    with AssessmentDetailRef {
  _AssessmentDetailProviderElement(super.provider);

  @override
  String get id => (origin as AssessmentDetailProvider).id;
}

String _$assessmentQuestionsHash() =>
    r'b6271740a921372e54194a6adb418eed3bd6f18d';

/// See also [assessmentQuestions].
@ProviderFor(assessmentQuestions)
const assessmentQuestionsProvider = AssessmentQuestionsFamily();

/// See also [assessmentQuestions].
class AssessmentQuestionsFamily extends Family<AsyncValue<List<Question>>> {
  /// See also [assessmentQuestions].
  const AssessmentQuestionsFamily();

  /// See also [assessmentQuestions].
  AssessmentQuestionsProvider call(
    String assessmentId,
  ) {
    return AssessmentQuestionsProvider(
      assessmentId,
    );
  }

  @override
  AssessmentQuestionsProvider getProviderOverride(
    covariant AssessmentQuestionsProvider provider,
  ) {
    return call(
      provider.assessmentId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'assessmentQuestionsProvider';
}

/// See also [assessmentQuestions].
class AssessmentQuestionsProvider
    extends AutoDisposeFutureProvider<List<Question>> {
  /// See also [assessmentQuestions].
  AssessmentQuestionsProvider(
    String assessmentId,
  ) : this._internal(
          (ref) => assessmentQuestions(
            ref as AssessmentQuestionsRef,
            assessmentId,
          ),
          from: assessmentQuestionsProvider,
          name: r'assessmentQuestionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$assessmentQuestionsHash,
          dependencies: AssessmentQuestionsFamily._dependencies,
          allTransitiveDependencies:
              AssessmentQuestionsFamily._allTransitiveDependencies,
          assessmentId: assessmentId,
        );

  AssessmentQuestionsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.assessmentId,
  }) : super.internal();

  final String assessmentId;

  @override
  Override overrideWith(
    FutureOr<List<Question>> Function(AssessmentQuestionsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AssessmentQuestionsProvider._internal(
        (ref) => create(ref as AssessmentQuestionsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        assessmentId: assessmentId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<Question>> createElement() {
    return _AssessmentQuestionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AssessmentQuestionsProvider &&
        other.assessmentId == assessmentId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, assessmentId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AssessmentQuestionsRef on AutoDisposeFutureProviderRef<List<Question>> {
  /// The parameter `assessmentId` of this provider.
  String get assessmentId;
}

class _AssessmentQuestionsProviderElement
    extends AutoDisposeFutureProviderElement<List<Question>>
    with AssessmentQuestionsRef {
  _AssessmentQuestionsProviderElement(super.provider);

  @override
  String get assessmentId =>
      (origin as AssessmentQuestionsProvider).assessmentId;
}

String _$assessmentSessionHash() => r'ea58f90588b13099d9f5f13dd4b2178e85c81f9e';

abstract class _$AssessmentSession
    extends BuildlessAutoDisposeNotifier<AssessmentSessionState> {
  late final String assessmentId;

  AssessmentSessionState build(
    String assessmentId,
  );
}

/// See also [AssessmentSession].
@ProviderFor(AssessmentSession)
const assessmentSessionProvider = AssessmentSessionFamily();

/// See also [AssessmentSession].
class AssessmentSessionFamily extends Family<AssessmentSessionState> {
  /// See also [AssessmentSession].
  const AssessmentSessionFamily();

  /// See also [AssessmentSession].
  AssessmentSessionProvider call(
    String assessmentId,
  ) {
    return AssessmentSessionProvider(
      assessmentId,
    );
  }

  @override
  AssessmentSessionProvider getProviderOverride(
    covariant AssessmentSessionProvider provider,
  ) {
    return call(
      provider.assessmentId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'assessmentSessionProvider';
}

/// See also [AssessmentSession].
class AssessmentSessionProvider extends AutoDisposeNotifierProviderImpl<
    AssessmentSession, AssessmentSessionState> {
  /// See also [AssessmentSession].
  AssessmentSessionProvider(
    String assessmentId,
  ) : this._internal(
          () => AssessmentSession()..assessmentId = assessmentId,
          from: assessmentSessionProvider,
          name: r'assessmentSessionProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$assessmentSessionHash,
          dependencies: AssessmentSessionFamily._dependencies,
          allTransitiveDependencies:
              AssessmentSessionFamily._allTransitiveDependencies,
          assessmentId: assessmentId,
        );

  AssessmentSessionProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.assessmentId,
  }) : super.internal();

  final String assessmentId;

  @override
  AssessmentSessionState runNotifierBuild(
    covariant AssessmentSession notifier,
  ) {
    return notifier.build(
      assessmentId,
    );
  }

  @override
  Override overrideWith(AssessmentSession Function() create) {
    return ProviderOverride(
      origin: this,
      override: AssessmentSessionProvider._internal(
        () => create()..assessmentId = assessmentId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        assessmentId: assessmentId,
      ),
    );
  }

  @override
  AutoDisposeNotifierProviderElement<AssessmentSession, AssessmentSessionState>
      createElement() {
    return _AssessmentSessionProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AssessmentSessionProvider &&
        other.assessmentId == assessmentId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, assessmentId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AssessmentSessionRef
    on AutoDisposeNotifierProviderRef<AssessmentSessionState> {
  /// The parameter `assessmentId` of this provider.
  String get assessmentId;
}

class _AssessmentSessionProviderElement
    extends AutoDisposeNotifierProviderElement<AssessmentSession,
        AssessmentSessionState> with AssessmentSessionRef {
  _AssessmentSessionProviderElement(super.provider);

  @override
  String get assessmentId => (origin as AssessmentSessionProvider).assessmentId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
