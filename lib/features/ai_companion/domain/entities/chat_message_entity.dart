enum MessageRole { user, assistant }

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.isStreaming = false,
    this.crisisDetected = false,
  });

  final String id;
  final MessageRole role;
  final String content;
  final DateTime createdAt;
  final bool isStreaming;
  final bool crisisDetected;

  ChatMessage copyWith({
    String? content,
    bool? isStreaming,
    bool? crisisDetected,
  }) =>
      ChatMessage(
        id: id,
        role: role,
        content: content ?? this.content,
        createdAt: createdAt,
        isStreaming: isStreaming ?? this.isStreaming,
        crisisDetected: crisisDetected ?? this.crisisDetected,
      );
}
