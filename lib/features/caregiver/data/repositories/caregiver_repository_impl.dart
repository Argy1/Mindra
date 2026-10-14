import 'dart:math';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/caregiver_entity.dart';
import '../models/caregiver_model.dart';

class CaregiverRepositoryImpl {
  CaregiverRepositoryImpl(this._client);
  final SupabaseClient _client;

  static const _table = 'caregiver_relationships';

  // ── Patient side ──────────────────────────────────────────────────────────

  Future<List<CaregiverRelationship>> getRelationshipsAsPatient(
      String patientId) async {
    try {
      final data = await _client
          .from(_table)
          .select('*, caregiver_profile:profiles!caregiver_id(name)')
          .eq('patient_id', patientId)
          .order('created_at', ascending: false) as List;
      return data
          .map((e) =>
              CaregiverRelationshipModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal memuat daftar caregiver.', e, st);
    }
  }

  Future<CaregiverRelationship> inviteCaregiver({
    required String patientId,
    required String caregiverPhone,
    required CaregiverPermissions permissions,
  }) async {
    final row = {
      'id': const Uuid().v4(),
      'patient_id': patientId,
      'caregiver_phone': caregiverPhone,
      // Hanya pengisi tempat: server (trigger trg_caregiver_relationships_assign_code)
      // SELALU menimpanya dengan kode acak, jadi kode yang dibaca balik di bawah adalah yang berlaku.
      'invite_code': _generateCode(),
      'status': 'pending',
      'permissions': permissions.toJson(),
    };
    final saved = await _client.from(_table).insert(row).select().single();
    return CaregiverRelationshipModel.fromJson(saved);
  }

  Future<void> updatePermissions(
      String relationshipId, CaregiverPermissions permissions) async {
    await _client
        .from(_table)
        .update({'permissions': permissions.toJson()}).eq('id', relationshipId);
  }

  Future<void> removeCaregiver(String relationshipId) async {
    await _client.from(_table).delete().eq('id', relationshipId);
  }

  // ── Caregiver side ────────────────────────────────────────────────────────

  Future<List<CaregiverRelationship>> getRelationshipsAsCaregiver(
      String caregiverId) async {
    try {
      final data = await _client
          .from(_table)
          .select()
          .eq('caregiver_id', caregiverId)
          .eq('status', 'active')
          .order('created_at', ascending: false) as List;
      // Nama pasien lewat RPC: pendamping tidak boleh membaca seluruh baris profil pasien.
      final names = await _patientNames();
      return data.map((e) {
        final json = e as Map<String, dynamic>;
        final name = names[json['patient_id']];
        return CaregiverRelationshipModel.fromJson({
          ...json,
          if (name != null) 'patient_profile': {'name': name},
        });
      }).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat daftar pasien.', e, st);
    }
  }

  /// Menerima undangan lewat RPC `accept_caregiver_invite`. Server yang mencocokkan kode, memeriksa
  /// kedaluwarsa, membatasi percobaan menebak, dan memakai akun yang sedang masuk (auth.uid())
  /// sebagai pendamping, sehingga [caregiverId] hanya dipertahankan demi kompatibilitas antarmuka.
  /// Mengembalikan null bila kode tidak valid.
  Future<CaregiverRelationship?> acceptInvite({
    required String inviteCode,
    required String caregiverId,
  }) async {
    try {
      final data = await _client
          .rpc('accept_caregiver_invite', params: {'p_code': inviteCode});
      if (data == null) return null;
      return CaregiverRelationshipModel.fromJson(
          Map<String, dynamic>.from(data as Map));
    } on PostgrestException catch (e, st) {
      // Pesan pembatasan percobaan sudah berbahasa Indonesia dan perlu sampai ke pengguna.
      if (e.message.startsWith('Terlalu banyak')) {
        throwAppException(e.message, e, st);
      }
      throwAppException('Gagal memproses kode undangan.', e, st);
    } catch (e, st) {
      throwAppException('Gagal memproses kode undangan.', e, st);
    }
  }

  /// Menolak undangan lewat RPC `decline_caregiver_invite`. Mengembalikan false bila kode tidak valid.
  Future<bool> declineInvite(String inviteCode) async {
    try {
      final data = await _client
          .rpc('decline_caregiver_invite', params: {'p_code': inviteCode});
      return data == true;
    } on PostgrestException catch (e, st) {
      if (e.message.startsWith('Terlalu banyak')) {
        throwAppException(e.message, e, st);
      }
      throwAppException('Gagal menolak undangan.', e, st);
    } catch (e, st) {
      throwAppException('Gagal menolak undangan.', e, st);
    }
  }

  /// patient_id -> nama untuk pasien yang hubungannya dengan akun ini aktif. Hanya nama: RPC
  /// `caregiver_patient_names` sengaja tidak mengembalikan kolom profil lain (email, tanggal lahir, NIK).
  /// Gagal memuat nama tidak boleh menggagalkan daftar, jadi galat menghasilkan peta kosong.
  Future<Map<String, String>> _patientNames() async {
    try {
      final rows = await _client.rpc('caregiver_patient_names') as List;
      return {
        for (final r in rows)
          (r as Map)['patient_id'] as String: r['name'] as String,
      };
    } catch (_) {
      return const {};
    }
  }

  // ── Patient summary for caregiver dashboard ───────────────────────────────

  Future<PatientSummary?> getPatientSummary(
      String patientId, CaregiverPermissions permissions) async {
    try {
      // Nama pasien lewat RPC (bukan membaca baris profil, lihat _patientNames).
      final name = (await _patientNames())[patientId] ?? 'Pengguna';

      // Last 7 days mood (if permitted)
      List<int?> weekMoods = List.filled(7, null);
      DateTime? lastActive;

      if (permissions.moodDaily) {
        final cutoff =
            DateTime.now().subtract(const Duration(days: 7)).toIso8601String();
        final moods = await _client
            .from('mood_entries')
            .select('mood_type, created_at')
            .eq('user_id', patientId)
            .gte('created_at', cutoff)
            .order('created_at', ascending: true) as List;

        final now = DateTime.now();
        for (final m in moods) {
          final date = DateTime.parse(m['created_at'] as String);
          final daysAgo = now.difference(date).inDays;
          if (daysAgo < 7) {
            weekMoods[6 - daysAgo] = _moodScore(m['mood_type'] as String?);
          }
        }
      }

      // Last active (always available — no raw data exposed)
      final lastMood = await _client
          .from('mood_entries')
          .select('created_at')
          .eq('user_id', patientId)
          .order('created_at', ascending: false)
          .limit(1) as List;
      if (lastMood.isNotEmpty) {
        lastActive = DateTime.parse(lastMood.first['created_at'] as String);
      }

      // Assessment category (if permitted)
      String? latestCategory;
      if (permissions.assessmentResults) {
        final assessments = await _client
            .from('assessments')
            .select('category')
            .eq('user_id', patientId)
            .order('completed_at', ascending: false)
            .limit(1) as List;
        if (assessments.isNotEmpty) {
          latestCategory = assessments.first['category'] as String?;
        }
      }

      // Simple streak from moods
      int streak = 0;
      for (int i = 6; i >= 0; i--) {
        if (weekMoods[i] != null) {
          streak++;
        } else {
          break;
        }
      }

      // Alert: if 2+ consecutive low moods (1-2) in last 3 days
      bool hasAlert = false;
      String? alertMsg;
      if (permissions.moodDaily) {
        final recentLow =
            weekMoods.skip(4).where((m) => m != null && m <= 2).length;
        if (recentLow >= 2) {
          hasAlert = true;
          alertMsg = 'Suasana hati rendah dalam beberapa hari terakhir.';
        }
      }

      return PatientSummary(
        patientId: patientId,
        patientName: name,
        weekMoods: weekMoods,
        activityStreak: streak,
        hasAlert: hasAlert,
        alertMessage: alertMsg,
        permissions: permissions,
        latestAssessmentCategory: latestCategory,
        lastActive: lastActive,
      );
    } catch (e, st) {
      throwAppException('Gagal memuat ringkasan pasien.', e, st);
    }
  }

  // ── Articles (static seeds) ───────────────────────────────────────────────

  List<CaregiverTip> getArticles() => CaregiverTipModel.seeds;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Maps a mood_entries.mood_type string to a 1–5 score for the caregiver
  /// dashboard. Returns null when the type is missing/unknown.
  int? _moodScore(String? moodType) => switch (moodType) {
        'bahagia' || 'syukur' => 5,
        'tenang' || 'hangat' => 4,
        'lelah' => 3,
        'cemas' => 2,
        'sedih' => 1,
        _ => null,
      };

  /// Kode berformat sama dengan buatan server, dari sumber acak aman (bukan jam). Server tetap
  /// menimpanya; ini hanya agar permintaan ke server versi lama pun tidak memakai kode yang bisa ditebak.
  String _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rng = Random.secure();
    return String.fromCharCodes(
      List.generate(8, (_) => chars.codeUnitAt(rng.nextInt(chars.length))),
    );
  }
}
