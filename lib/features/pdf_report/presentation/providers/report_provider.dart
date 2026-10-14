import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/report_repository_impl.dart';
import '../../domain/entities/report_entity.dart';

part 'report_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Options state (what the user configured before generating)
// ─────────────────────────────────────────────────────────────────────────────

class ReportOptions {
  const ReportOptions({
    this.periodDays = 30,
    this.sections = ReportSection.all,
    this.selectedReflectionIds = const [],
  });

  final int periodDays;
  final Set<String> sections;
  final List<String> selectedReflectionIds;

  ReportOptions copyWith({
    int? periodDays,
    Set<String>? sections,
    List<String>? selectedReflectionIds,
  }) =>
      ReportOptions(
        periodDays: periodDays ?? this.periodDays,
        sections: sections ?? this.sections,
        selectedReflectionIds:
            selectedReflectionIds ?? this.selectedReflectionIds,
      );
}

class ReportOptionsNotifier extends StateNotifier<ReportOptions> {
  ReportOptionsNotifier() : super(const ReportOptions());

  void setPeriod(int days) => state = state.copyWith(periodDays: days);

  void toggleSection(String section) {
    final updated = Set<String>.from(state.sections);
    if (updated.contains(section)) {
      if (updated.length > 1) updated.remove(section);
    } else {
      updated.add(section);
    }
    state = state.copyWith(sections: updated);
  }

  void toggleReflection(String id) {
    final ids = List<String>.from(state.selectedReflectionIds);
    if (ids.contains(id)) {
      ids.remove(id);
    } else {
      ids.add(id);
    }
    state = state.copyWith(selectedReflectionIds: ids);
  }

  void selectAllReflections() =>
      state = state.copyWith(selectedReflectionIds: []);
}

final reportOptionsProvider =
    StateNotifierProvider.autoDispose<ReportOptionsNotifier, ReportOptions>(
  (_) => ReportOptionsNotifier(),
);

// ─────────────────────────────────────────────────────────────────────────────
// Generation state (loading → success → error)
// ─────────────────────────────────────────────────────────────────────────────

class ReportGenerationState {
  const ReportGenerationState({
    this.isLoading = false,
    this.pdfPath,
    this.pdfBytes,
    this.error,
    this.progress = 0.0,
  });

  final bool isLoading;
  final String? pdfPath;
  final Uint8List? pdfBytes;
  final String? error;
  final double progress; // 0.0 – 1.0

  bool get hasResult => pdfPath != null && pdfBytes != null;
}

class ReportGenerationNotifier extends StateNotifier<ReportGenerationState> {
  ReportGenerationNotifier(this._repo) : super(const ReportGenerationState());

  final ReportRepositoryImpl _repo;

  Future<void> generate({
    required String userId,
    required String userName,
    required ReportOptions options,
  }) async {
    state = const ReportGenerationState(isLoading: true, progress: 0.1);
    try {
      state = state.copyWith(progress: 0.3);
      final report = await _repo.buildReport(
        userId,
        userName: userName,
        periodDays: options.periodDays,
        sections: options.sections,
        selectedReflectionIds: options.selectedReflectionIds,
      );
      state = state.copyWith(progress: 0.7);
      final bytes = await _repo.buildPdfBytes(report);
      final path = await _repo.savePdf(bytes);
      state = ReportGenerationState(
        isLoading: false,
        pdfPath: path,
        pdfBytes: bytes,
        progress: 1.0,
      );
    } catch (e) {
      state = ReportGenerationState(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal membuat laporan.'),
      );
    }
  }

  void reset() => state = const ReportGenerationState();
}

// Extension so copyWith works on the state
extension on ReportGenerationState {
  ReportGenerationState copyWith({
    bool? isLoading,
    String? pdfPath,
    Uint8List? pdfBytes,
    String? error,
    double? progress,
  }) =>
      ReportGenerationState(
        isLoading: isLoading ?? this.isLoading,
        pdfPath: pdfPath ?? this.pdfPath,
        pdfBytes: pdfBytes ?? this.pdfBytes,
        error: error ?? this.error,
        progress: progress ?? this.progress,
      );
}

final reportGenerationProvider = StateNotifierProvider.autoDispose<
    ReportGenerationNotifier, ReportGenerationState>(
  (ref) => ReportGenerationNotifier(
    ReportRepositoryImpl(ref.watch(supabaseProvider)),
  ),
);
