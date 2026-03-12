import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/config/api_config.dart';
import '../models/user.dart';

class AuthService {
  final Dio _dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<String?> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      if (response.statusCode == 200) {
        final token = response.data['access_token'];
        await _storage.write(key: 'jwt_token', value: token);
        return null; // Success
      }
      return "Erro no login";
    } on DioException catch (e) {
      return e.response?.data['detail'] ?? "Falha na conexão";
    }
  }

  Future<String?> register(String name, String email, String password) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
      });
      
      if (response.statusCode == 200) {
        return null; // Success
      }
      return "Erro no cadastro";
    } on DioException catch (e) {
      return e.response?.data['detail'] ?? "Falha na conexão";
    }
  }

  Future<User?> getCurrentUser() async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return null;

    try {
      final response = await _dio.get('/auth/me', options: Options(headers: {
        'Authorization': 'Bearer $token',
      }));
      
      if (response.statusCode == 200) {
        return User.fromJson(response.data);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }
}
