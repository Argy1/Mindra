import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/repositories/profile_repository.dart';
import '../models/user_profile_model.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  const ProfileRepositoryImpl(this._client);
  final dynamic _client;

  @override
  Future<UserProfileEntity?> getProfile(String userId) async {
    try {
      final data = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle() as Map<String, dynamic>?;
      return data == null ? null : UserProfileModel.fromJson(data);
    } catch (e, st) {
      throwAppException('Gagal memuat profil.', e, st);
    }
  }

  Future<UserProfileEntity> getOrCreateProfile({
    required String userId,
    required String email,
    String? fullName,
  }) async {
    final existing = await getProfile(userId);
    if (existing != null) return existing;

    final fallbackName = fullName?.trim().isNotEmpty == true
        ? fullName!.trim()
        : email.split('@').first;

    final profile = UserProfileModel(
      id: userId,
      email: email,
      name: fallbackName.isEmpty ? 'Pengguna' : fallbackName,
    );

    await _client.from('profiles').upsert(profile.toJson());
    return profile;
  }

  @override
  Future<void> updateProfile(UserProfileEntity p) async {
    await _client.from('profiles').upsert(
          UserProfileModel(
            id: p.id,
            email: p.email,
            name: p.name,
            avatarUrl: p.avatarUrl,
            dateOfBirth: p.dateOfBirth,
            gender: p.gender,
            city: p.city,
            province: p.province,
            shareRegionStats: p.shareRegionStats,
            notificationsEnabled: p.notificationsEnabled,
            reminderTime: p.reminderTime,
          ).toJson(),
        );
  }

  @override
  Future<String?> uploadAvatar(String userId, String filePath) async {
    try {
      final storagePath = '$userId/avatar.jpg';
      await _client.storage.from('profile_photos').upload(
            storagePath,
            filePath,
            fileOptions: const FileOptions(upsert: true),
          );
      return _client.storage.from('profile_photos').getPublicUrl(storagePath)
          as String;
    } catch (e, st) {
      throwAppException('Gagal mengunggah foto profil.', e, st);
    }
  }

  /// Menghapus akun beserta SELURUH datanya lewat fungsi database `delete_my_account` (migrasi 20261014000600).
  /// Kata sandi diperiksa ulang lebih dulu. (Versi lama hanya menghapus baris profil dan meninggalkan akun masuknya.)
  @override
  Future<void> deleteAccount({
    required String email,
    required String password,
  }) async {
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
    } on AuthException {
      throw const AppException(
          'Kata sandi belum benar. Periksa lagi lalu coba kirim.');
    } catch (e, st) {
      throwAppException(
          'Koneksi terputus. Periksa jaringanmu, lalu coba lagi.', e, st);
    }

    try {
      await _client.rpc('delete_my_account');
    } on PostgrestException catch (e, st) {
      throwAppException(
        e.message == 'role_not_deletable'
            ? 'Akun jenis ini tidak bisa dihapus sendiri. Hubungi pengelola Mindra.'
            : 'Akun belum bisa dihapus. Coba lagi sebentar lagi.',
        e,
        st,
      );
    }

    // Akunnya sudah tidak ada; sesi lokal tinggal dibersihkan. Galat di sini tidak boleh menahan pengguna.
    try {
      await _client.auth.signOut();
    } catch (_) {}
  }
}
