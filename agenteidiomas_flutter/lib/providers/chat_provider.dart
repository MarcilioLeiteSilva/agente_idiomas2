import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dio_provider.dart';
import '../services/chat_service.dart';
import '../models/chat_message.dart';

final chatServiceProvider = Provider((ref) => ChatService(ref.watch(dioClientProvider)));

final chatProvider = StateNotifierProvider<ChatNotifier, List<ChatMessage>>((ref) {
  return ChatNotifier(ref.watch(chatServiceProvider));
});

class ChatNotifier extends StateNotifier<List<ChatMessage>> {
  final ChatService _service;

  ChatNotifier(this._service) : super([]) {
    fetchHistory();
  }

  Future<void> fetchHistory() async {
    state = await _service.getRecentMessages();
  }

  Future<void> sendMessage(String text) async {
    // Add optimistic user message
    final userMsg = ChatMessage(role: 'user', content: text);
    state = [...state, userMsg];
    
    final response = await _service.sendMessage(text);
    if (response != null) {
      state = [...state, response];
    }
  }
}
