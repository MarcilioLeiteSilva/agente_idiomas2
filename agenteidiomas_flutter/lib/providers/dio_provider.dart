import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/config/dio_client.dart';

final dioClientProvider = Provider((ref) => DioClient());
