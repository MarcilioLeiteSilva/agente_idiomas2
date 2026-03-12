import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dio_provider.dart';
import '../services/lesson_service.dart';
import '../models/lesson.dart';
import '../models/user_progress.dart';

final lessonServiceProvider = Provider((ref) => LessonService(ref.watch(dioClientProvider)));

final lessonsListProvider = FutureProvider<List<Lesson>>((ref) async {
  return ref.watch(lessonServiceProvider).getLessons();
});

final progressProvider = FutureProvider<List<UserProgress>>((ref) async {
  return ref.watch(lessonServiceProvider).getProgress();
});
