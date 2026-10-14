import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/facilities_repository_impl.dart';
import '../../domain/entities/facility_entity.dart';

part 'facilities_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

class FacilitiesState {
  const FacilitiesState({
    this.all = const [],
    this.isLoading = false,
    this.error,
    this.userLat = -6.2088, // Jakarta Pusat default
    this.userLng = 106.8456,
    this.hasUserLocation = false,
    this.activeFilters = const [],
    this.searchQuery = '',
    this.selectedFacility,
    this.isCrisisMode = false,
  });

  final List<MentalHealthFacility> all;
  final bool isLoading;
  final String? error;
  final double userLat;
  final double userLng;
  final bool hasUserLocation;
  final List<FacilityType> activeFilters;
  final String searchQuery;
  final MentalHealthFacility? selectedFacility;
  final bool isCrisisMode;

  List<MentalHealthFacility> get filtered {
    var list = all;

    if (isCrisisMode) {
      list = list.where((f) => f.type == FacilityType.rsjiwa || f.hasIgd).toList();
    } else if (activeFilters.isNotEmpty) {
      list = list.where((f) => activeFilters.contains(f.type)).toList();
    }

    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      list = list
          .where((f) =>
              f.name.toLowerCase().contains(q) ||
              f.address.toLowerCase().contains(q))
          .toList();
    }

    list = List.of(list)
      ..sort((a, b) {
        if (a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm!.compareTo(b.distanceKm!);
        }
        if (a.distanceKm != null) return -1;
        if (b.distanceKm != null) return 1;
        return a.name.compareTo(b.name);
      });

    return list;
  }

  FacilitiesState copyWith({
    List<MentalHealthFacility>? all,
    bool? isLoading,
    Object? error = _sentinel,
    double? userLat,
    double? userLng,
    bool? hasUserLocation,
    List<FacilityType>? activeFilters,
    String? searchQuery,
    Object? selectedFacility = _sentinel,
    bool? isCrisisMode,
  }) =>
      FacilitiesState(
        all: all ?? this.all,
        isLoading: isLoading ?? this.isLoading,
        error: error == _sentinel ? this.error : error as String?,
        userLat: userLat ?? this.userLat,
        userLng: userLng ?? this.userLng,
        hasUserLocation: hasUserLocation ?? this.hasUserLocation,
        activeFilters: activeFilters ?? this.activeFilters,
        searchQuery: searchQuery ?? this.searchQuery,
        selectedFacility: selectedFacility == _sentinel
            ? this.selectedFacility
            : selectedFacility as MentalHealthFacility?,
        isCrisisMode: isCrisisMode ?? this.isCrisisMode,
      );
}

const _sentinel = Object();

// ─────────────────────────────────────────────────────────────────────────────
// Notifier
// ─────────────────────────────────────────────────────────────────────────────

class FacilitiesNotifier extends StateNotifier<FacilitiesState> {
  FacilitiesNotifier(this._repo) : super(const FacilitiesState()) {
    load();
  }

  final FacilitiesRepositoryImpl _repo;
  Timer? _debounce;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final facilities = await _repo.getFacilities(
        lat: state.userLat,
        lng: state.userLng,
      );
      state = state.copyWith(all: facilities, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setCrisisMode(bool v) {
    state = state.copyWith(isCrisisMode: v, activeFilters: []);
  }

  void toggleFilter(FacilityType type) {
    final filters = List<FacilityType>.from(state.activeFilters);
    if (filters.contains(type)) {
      filters.remove(type);
    } else {
      filters.add(type);
    }
    state = state.copyWith(activeFilters: filters);
  }

  void setSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      state = state.copyWith(searchQuery: q);
    });
  }

  void selectFacility(MentalHealthFacility? f) =>
      state = state.copyWith(selectedFacility: f);

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

final facilitiesProvider = StateNotifierProvider.autoDispose<
    FacilitiesNotifier, FacilitiesState>(
  (ref) => FacilitiesNotifier(
    FacilitiesRepositoryImpl(ref.watch(supabaseProvider)),
  ),
);
