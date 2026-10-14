import '../entities/chat_message_entity.dart';
import '../entities/companion_event.dart';

abstract class CompanionRepository {
  /// Mengirim satu pesan ke server dan mengalirkan peristiwa balasan. Penyimpanan percakapan dilakukan server.
  Stream<CompanionEvent> sendMessage({
    String? conversationId,
    required String message,
  });
  Future<List<ChatMessage>> getHistory(String sessionId);
  Future<void> clearHistory(String sessionId);
}
