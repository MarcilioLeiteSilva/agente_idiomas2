import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_config.dart';

class DioClient {
  final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  DioClient() : dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl)) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (e, handler) {
        // Handle errors globally
        return handler.next(e);
      },
    ));
  }
}
