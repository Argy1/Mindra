import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../../core/services/companion_api_service.dart';
import '../../data/crisis_detector.dart';
import '../../data/datasources/companion_remote_datasource.dart';
import '../../data/repositories/companion_repository_impl.dart';
import '../../domain/entities/chat_message_entity.dart';
import '../../domain/entities/companion_event.dart';

part 'companion_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers (signatures stable — do not change)
// ─────────────────────────────────────────────────────────────────────────────

/// Teman cerita berjalan di server Mindra Web: aplikasi mengirim pesan dengan token sesi Supabase dan menampilkan
/// peristiwa balasan. Tidak ada kunci model di aplikasi.
@riverpod
CompanionRepositoryImpl companionRepository(Ref ref) {
  final supabase = ref.watch(supabaseProvider);
  return CompanionRepositoryImpl(
    CompanionRemoteDatasourceImpl(
      service: CompanionApiService(
        baseUrl: AppConstants.webApiBaseUrl,
        accessToken: () async => supabase.auth.currentSession?.accessToken,
      ),
      supabaseClient: supabase,
    ),
  );
}

@riverpod
class CompanionSession extends _$CompanionSession {
  String? _conversationId;
  String? _lastUserMessage;

  @override
  List<ChatMessage> build() {
    _conversationId = null;
    _lastUserMessage = null;
    return [];
  }

  /// Mengganti satu pesan (berdasarkan id) tanpa mengubah urutan.
  void _replace(ChatMessage message) {
    state = [for (final m in state) m.id == message.id ? message : m];
  }

  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    ref.read(companionErrorProvider.notifier).state = null;
    _lastUserMessage = trimmed;

    // Deteksi krisis lokal berjalan sinkron supaya lapisan bantuan bisa muncul bahkan sebelum jaringan menjawab.
    // Keputusan resminya tetap di server (aturan yang sama, dan balasan krisis tidak memanggil model).
    final userCrisis = CrisisDetector.detect(trimmed);
    if (userCrisis) {
      ref.read(crisisDetectedProvider.notifier).state = true;
    }

    var userMsg = ChatMessage(
      id: const Uuid().v4(),
      role: MessageRole.user,
      content: trimmed,
      createdAt: DateTime.now(),
      crisisDetected: userCrisis,
    );
    var assistantMsg = ChatMessage(
      id: const Uuid().v4(),
      role: MessageRole.assistant,
      content: '',
      createdAt: DateTime.now(),
      isStreaming: true,
    );
    state = [...state, userMsg, assistantMsg];

    final repo = ref.read(companionRepositoryProvider);
    try {
      await for (final event in repo.sendMessage(
        conversationId: _conversationId,
        message: trimmed,
      )) {
        switch (event) {
          case CompanionMeta(:final conversationId):
            _conversationId = conversationId;
          case CompanionDelta(:final text):
            assistantMsg =
                assistantMsg.copyWith(content: assistantMsg.content + text);
            _replace(assistantMsg);
          case CompanionCrisis(:final message):
            // Server memutuskan ini krisis (bisa lebih peka daripada deteksi lokal): tampilkan balasan tetapnya.
            ref.read(crisisDetectedProvider.notifier).state = true;
            userMsg = userMsg.copyWith(crisisDetected: true);
            _replace(userMsg);
            assistantMsg = assistantMsg.copyWith(
              content: message,
              crisisDetected: true,
            );
            _replace(assistantMsg);
          case CompanionDone(:final saved):
            if (!saved) {
              ref.read(companionErrorProvider.notifier).state =
                  'Balasan sudah sampai, tapi riwayat percakapan belum tersimpan.';
            }
          case CompanionStreamError():
            // Galat di tengah aliran sudah diubah menjadi CompanionApiException oleh layanan.
            break;
        }
      }
      assistantMsg = assistantMsg.copyWith(isStreaming: false);
      _replace(assistantMsg);
    } on CompanionApiException catch (e) {
      ref.read(companionErrorProvider.notifier).state = e.message;
      // Percakapan yang tidak bisa dilanjutkan: pesan berikutnya memulai percakapan baru.
      if (e.conversationUnusable) _conversationId = null;
      // Buang placeholder balasan yang kosong atau setengah jadi.
      state = state.where((m) => m.id != assistantMsg.id).toList();
    } catch (e) {
      ref.read(companionErrorProvider.notifier).state =
          errorMessage(e, fallback: 'Terjadi kesalahan. Coba lagi.');
      state = state.where((m) => m.id != assistantMsg.id).toList();
    }
  }

  /// Retries the last user message after a transient failure.
  Future<void> retryLast() async {
    final msg = _lastUserMessage;
    if (msg == null) return;
    // Strip the most recent user turn (will be re-added by sendMessage).
    final lastUserIdx = state.lastIndexWhere(
      (m) => m.role == MessageRole.user && m.content == msg,
    );
    if (lastUserIdx >= 0) {
      state = state.sublist(0, lastUserIdx);
    }
    await sendMessage(msg);
  }

  void clear() {
    _conversationId = null;
    _lastUserMessage = null;
    ref.read(crisisDetectedProvider.notifier).state = false;
    ref.read(companionErrorProvider.notifier).state = null;
    state = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// New manual providers (no codegen)
// ─────────────────────────────────────────────────────────────────────────────

/// Whether the crisis overlay should be visible. Set to `true` by
/// [CompanionSession.sendMessage] when crisis language is detected.
final crisisDetectedProvider = StateProvider<bool>((_) => false);

/// Last transport/API error message, or `null` when there is none.
/// Cleared at the start of every send and on [CompanionSession.clear].
final companionErrorProvider = StateProvider<String?>((_) => null);

/// Tracks whether the disclaimer banner has been dismissed for today.
/// Persists the dismissal date in SharedPreferences under `ai_disclaimer_dismissed`.
class DisclaimerBannerController extends StateNotifier<bool> {
  DisclaimerBannerController() : super(true) {
    _load();
  }

  static const _key = 'ai_disclaimer_dismissed_date';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_key);
    final today = _todayKey();
    state = stored != today; // visible unless dismissed today
  }

  Future<void> dismiss() async {
    state = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, _todayKey());
  }

  static String _todayKey() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}';
  }
}

final disclaimerBannerProvider =
    StateNotifierProvider<DisclaimerBannerController, bool>(
  (_) => DisclaimerBannerController(),
);
