import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/journal_repository_impl.dart';
import '../../domain/entities/journal_entry_entity.dart';

part 'journal_provider.g.dart';

final voiceJournalRepositoryProvider = Provider<VoiceJournalRepositoryImpl>(
  (ref) => VoiceJournalRepositoryImpl(ref.watch(supabaseProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Journal list state
// ─────────────────────────────────────────────────────────────────────────────

class VoiceJournalListState {
  const VoiceJournalListState({
    this.entries = const [],
    this.isLoading = false,
    this.error,
  });

  final List<VoiceJournalEntry> entries;
  final bool isLoading;
  final String? error;

  VoiceJournalListState copyWith({
    List<VoiceJournalEntry>? entries,
    bool? isLoading,
    String? error,
  }) =>
      VoiceJournalListState(
        entries: entries ?? this.entries,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class VoiceJournalListNotifier extends StateNotifier<VoiceJournalListState> {
  VoiceJournalListNotifier(this._repo) : super(const VoiceJournalListState());
  final VoiceJournalRepositoryImpl _repo;

  Future<void> load(String userId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final entries = await _repo.getEntries(userId);
      state = VoiceJournalListState(entries: entries, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat jurnal suara.'),
      );
    }
  }

  Future<void> delete(VoiceJournalEntry entry) async {
    state = state.copyWith(error: null);
    try {
      await _repo.deleteEntry(entry);
      state = state.copyWith(
        entries: state.entries.where((e) => e.id != entry.id).toList(),
      );
    } catch (e) {
      state = state.copyWith(
        error: errorMessage(e, fallback: 'Gagal menghapus jurnal suara.'),
      );
    }
  }

  Future<void> save({
    required String userId,
    required String localFilePath,
    required int durationSeconds,
    String? moodEmoji,
    String? note,
  }) async {
    final entry = await _repo.saveEntry(
      userId: userId,
      entryId: const Uuid().v4(),
      localFilePath: localFilePath,
      durationSeconds: durationSeconds,
      moodEmoji: moodEmoji,
      note: note,
    );
    state = state.copyWith(entries: [entry, ...state.entries]);
  }

  Future<String> downloadForPlayback(VoiceJournalEntry entry, String tempDir) =>
      _repo.downloadAndDecrypt(entry, tempDir);
}

final voiceJournalListProvider =
    StateNotifierProvider<VoiceJournalListNotifier, VoiceJournalListState>(
  (ref) => VoiceJournalListNotifier(ref.watch(voiceJournalRepositoryProvider)),
);
