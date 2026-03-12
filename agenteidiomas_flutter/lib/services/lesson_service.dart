import 'package:dio/dio.dart';
import '../core/config/dio_client.dart';
import '../models/lesson.dart';
import '../models/user_progress.dart';

class LessonService {
  final Dio _dio;

  LessonService(DioClient dioClient) : _dio = dioClient.dio;

  Future<List<Lesson>> getLessons() async {
    try {
      final response = await _dio.get('/lessons');
      if (response.statusCode == 200) {
        final List list = response.data;
        return list.map((l) => Lesson.fromJson(l)).toList();
      }
    } catch (e) {
      return [];
    }
    return [];
  }

  Future<List<UserProgress>> getProgress() async {
    try {
      final response = await _dio.get('/progress');
      if (response.statusCode == 200) {
        final List list = response.data;
        return list.map((p) => UserProgress.fromJson(p)).toList();
      }
    } catch (e) {
      return [];
    }
    return [];
  }
}
