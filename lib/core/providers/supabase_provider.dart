import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

part 'supabase_provider.g.dart';

@riverpod
SupabaseClient supabase(Ref ref) => Supabase.instance.client;

@riverpod
Stream<AuthState> authStateChanges(Ref ref) =>
    ref.watch(supabaseProvider).auth.onAuthStateChange;
