import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/lesson_provider.dart';

class LessonsScreen extends ConsumerWidget {
  const LessonsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lessonsAsync = ref.watch(lessonsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("Lições")),
      body: lessonsAsync.when(
        data: (lessons) => ListView.builder(
          itemCount: lessons.length,
          itemBuilder: (context, index) {
            final lesson = lessons[index];
            return ListTile(
              leading: const Icon(Icons.book),
              title: Text(lesson.title),
              subtitle: Text("${lesson.language} - ${lesson.level}"),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // Navigate to lesson detail
              },
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text("Erro ao carregar lições: $e")),
      ),
    );
  }
}
