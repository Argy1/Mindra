import '../entities/companion_event.dart';
import '../repositories/companion_repository.dart';

class SendMessage {
  const SendMessage(this._repository);
  final CompanionRepository _repository;

  Stream<CompanionEvent> call(String? conversationId, String message) =>
      _repository.sendMessage(
        conversationId: conversationId,
        message: message,
      );
}
