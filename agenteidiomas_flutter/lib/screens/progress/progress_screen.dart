import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/lesson_provider.dart';

class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progressAsync = ref.watch(progressProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("Meu Progresso")),
      body: progressAsync.when(
        data: (items) => items.isEmpty 
          ? const Center(child: Text("Nenhuma lição concluída ainda."))
          : ListView.builder(
            itemCount: items.length,
            itemBuilder: (context, index) {
              final p = items[index];
              return ListTile(
                leading: Icon(p.status == 'completed' ? Icons.check_circle : Icons.pending, 
                             color: p.status == 'completed' ? Colors.green : Colors.orange),
                title: Text("Lição: ${p.lessonId}"),
                subtitle: Text("Status: ${p.status}"),
                trailing: Text("Pontos: ${p.score}"),
              );
            },
          ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text("Erro: $e")),
      ),
    );
  }
}
