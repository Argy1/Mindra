import '../../domain/entities/chat_message_entity.dart';

class ChatMessageModel extends ChatMessage {
  const ChatMessageModel({
    required super.id,
    required super.role,
    required super.content,
    required super.createdAt,
    super.isStreaming,
    super.crisisDetected,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) =>
      ChatMessageModel(
        id: json['id'] as String,
        role: json['role'] == 'user' ? MessageRole.user : MessageRole.assistant,
        content: json['content'] as String,
        createdAt: DateTime.parse(
          (json['timestamp'] ?? json['created_at']) as String,
        ),
        crisisDetected: json['crisis_detected'] as bool? ?? false,
      );

  /// Stored as JSONB element on the `ai_conversations.messages` array.
  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role == MessageRole.user ? 'user' : 'assistant',
        'content': content,
        'timestamp': createdAt.toIso8601String(),
        if (crisisDetected) 'crisis_detected': true,
      };

  /// Format expected by the Anthropic Messages API.
  Map<String, dynamic> toApiMessage() => {
        'role': role == MessageRole.user ? 'user' : 'assistant',
        'content': content,
      };
}
