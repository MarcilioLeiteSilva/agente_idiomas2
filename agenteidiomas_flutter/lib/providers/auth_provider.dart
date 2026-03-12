import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

final authServiceProvider = Provider((ref) => AuthService());

final userProvider = StateProvider<User?>((ref) => null);

final authStateProvider = FutureProvider<bool>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final user = await authService.getCurrentUser();
  if (user != null) {
    ref.read(userProvider.notifier).state = user;
    return true;
  }
  return false;
});
