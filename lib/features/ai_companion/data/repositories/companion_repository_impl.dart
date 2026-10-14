import '../../domain/entities/chat_message_entity.dart';
import '../../domain/entities/companion_event.dart';
import '../../domain/repositories/companion_repository.dart';
import '../datasources/companion_remote_datasource.dart';

class CompanionRepositoryImpl implements CompanionRepository {
  const CompanionRepositoryImpl(this._datasource);
  final CompanionRemoteDatasource _datasource;

  @override
  Stream<CompanionEvent> sendMessage({
    String? conversationId,
    required String message,
  }) =>
      _datasource.sendMessage(
        conversationId: conversationId,
        message: message,
      );

  @override
  Future<List<ChatMessage>> getHistory(String sessionId) =>
      _datasource.getHistory(sessionId);

  @override
  Future<void> clearHistory(String sessionId) async {}
}
