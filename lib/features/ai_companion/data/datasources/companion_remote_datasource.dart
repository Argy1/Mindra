import 'dart:async';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/services/companion_api_service.dart';
import '../../domain/entities/companion_event.dart';
import '../models/chat_message_model.dart';

abstract class CompanionRemoteDatasource {
  /// Mengirim satu pesan; server memuat riwayat dari [conversationId], menjawab, dan menyimpan percakapan.
  Stream<CompanionEvent> sendMessage({
    String? conversationId,
    required String message,
  });
  Future<List<ChatMessageModel>> getHistory(String sessionId);
}

/// Teman cerita lewat server Mindra Web (`POST /api/v1/companion/chat`).
///
/// Perintah sistem, deteksi krisis berbasis aturan, penyimpanan percakapan, dan batas laju semuanya ada di server
/// (satu sumber untuk web dan aplikasi). Aplikasi tidak lagi memegang kunci model.
class CompanionRemoteDatasourceImpl implements CompanionRemoteDatasource {
  CompanionRemoteDatasourceImpl({
    required CompanionApiService service,
    required this.supabaseClient,
  }) : _service = service;

  final dynamic supabaseClient;
  final CompanionApiService _service;

  @override
  Stream<CompanionEvent> sendMessage({
    String? conversationId,
    required String message,
  }) =>
      _service.send(conversationId: conversationId, message: message);

  @override
  Future<List<ChatMessageModel>> getHistory(String sessionId) async {
    try {
      final data = await supabaseClient
          .from('ai_conversations')
          .select()
          .eq('id', sessionId)
          .maybeSingle() as Map<String, dynamic>?;
      if (data == null) return const [];
      final messages = data['messages'] as List? ?? const [];
      return messages
          .map((m) => ChatMessageModel.fromJson(m as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal memuat riwayat chat.', e, st);
    }
  }

  void dispose() => _service.dispose();
}
