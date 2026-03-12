import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("Meu Perfil")),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircleAvatar(radius: 50, child: Icon(Icons.person, size: 50)),
              const SizedBox(height: 24),
              Text(user?.name ?? 'Carregando...', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 16),
              Chip(label: Text(user?.role.toUpperCase() ?? '')),
              const SizedBox(height: 48),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text("Sair da conta", style: TextStyle(color: Colors.red)),
                onTap: () async {
                  await ref.read(authServiceProvider).logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
