import 'package:dio/dio.dart';
import '../core/config/dio_client.dart';
import '../models/chat_message.dart';

class ChatService {
  final Dio _dio;

  ChatService(DioClient dioClient) : _dio = dioClient.dio;

  Future<ChatMessage?> sendMessage(String message) async {
    try {
      final response = await _dio.post('/message', data: {'message': message});
      if (response.statusCode == 200) {
        return ChatMessage.fromJson(response.data);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  Future<List<ChatMessage>> getRecentMessages() async {
    try {
      final response = await _dio.get('/chat/recent');
      if (response.statusCode == 200) {
        final List list = response.data;
        return list.map((m) => ChatMessage.fromJson(m)).toList();
      }
    } catch (e) {
      return [];
    }
    return [];
  }
}
