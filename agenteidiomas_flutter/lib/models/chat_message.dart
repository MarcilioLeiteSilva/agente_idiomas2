class ChatMessage {
  final String role;
  final String content;
  final Map<String, dynamic>? meta;

  ChatMessage({
    required this.role,
    required this.content,
    this.meta,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      role: json['role'] ?? '',
      content: json['content'] ?? '',
      meta: json['meta'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
      if (meta != null) 'meta': meta,
    };
  }
}
