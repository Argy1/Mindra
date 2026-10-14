import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../errors/app_exception.dart';

/// Central access point for Supabase operations.
///
/// Obtain via [SupabaseService.instance] — initialized after
/// [Supabase.initialize] in main.dart.
class SupabaseService {
  SupabaseService._();
  static final SupabaseService instance = SupabaseService._();

  SupabaseClient get client => Supabase.instance.client;

  // ── Auth helpers ────────────────────────────────────────────────────────────

  User? get currentUser => client.auth.currentUser;

  String? get currentUserId => currentUser?.id;

  bool get isSignedIn => currentUser != null;

  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  Future<AuthResponse> signUpWithEmail({
    required String email,
    required String password,
    String? fullName,
  }) =>
      client.auth.signUp(
        email: email,
        password: password,
        data: fullName != null ? {'full_name': fullName} : null,
      );

  Future<AuthResponse> signInWithEmail({
    required String email,
    required String password,
  }) =>
      client.auth.signInWithPassword(email: email, password: password);

  Future<void> signOut() => client.auth.signOut();

  Future<void> sendPasswordReset(String email) =>
      client.auth.resetPasswordForEmail(email);

  // ── Table name constants (avoids string typos) ──────────────────────────────

  static const String tProfiles = 'profiles';
  static const String tAssessments = 'assessments';
  static const String tMoodEntries = 'mood_entries';
  static const String tSleepEntries = 'sleep_entries';
  static const String tNightReflections = 'night_reflections';
  static const String tReflectionQuestions = 'reflection_questions';
  static const String tVoiceJournals = 'voice_journals';
  static const String tCbtExercises = 'cbt_exercises';
  static const String tPsychologists = 'psychologists';
  static const String tPsychSchedules = 'psychologist_schedules';
  static const String tConsultations = 'consultations';
  static const String tConsultMessages = 'consultation_messages';
  static const String tAiConversations = 'ai_conversations';
  static const String tEmergencyContacts = 'emergency_contacts';
  static const String tCaregiverRels = 'caregiver_relationships';
  static const String tNotificationsLog = 'notifications_log';
  static const String tSatusehatSyncLog = 'satusehat_sync_log';

  // ── Storage bucket names ─────────────────────────────────────────────────────

  static const String bucketProfilePhotos = 'profile_photos';
  static const String bucketVoiceJournals = 'voice-journals';
  static const String bucketConsultationAssets = 'consultation_assets';

  // ── Profile helpers ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> fetchProfile(String userId) async {
    final response =
        await client.from(tProfiles).select().eq('id', userId).maybeSingle();
    return response;
  }

  Future<void> upsertProfile(Map<String, dynamic> data) =>
      client.from(tProfiles).upsert(data);

  // ── Avatar upload ────────────────────────────────────────────────────────────

  /// Uploads [bytes] as the current user's avatar and returns the public URL.
  Future<String?> uploadAvatar({
    required String userId,
    required Uint8List bytes,
    String mimeType = 'image/jpeg',
  }) async {
    try {
      final path = '$userId/avatar.jpg';
      await client.storage.from(bucketProfilePhotos).uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: mimeType, upsert: true),
          );
      return client.storage.from(bucketProfilePhotos).getPublicUrl(path);
    } catch (e, st) {
      throwAppException('Gagal mengunggah foto profil.', e, st);
    }
  }

  // ── Mood helpers ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> fetchTodayMood(String userId) async {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return client
        .from(tMoodEntries)
        .select()
        .eq('user_id', userId)
        .eq('recorded_date', today)
        .maybeSingle();
  }

  Future<List<Map<String, dynamic>>> fetchMoodHistory(
    String userId, {
    int limit = 30,
  }) async {
    final data = await client
        .from(tMoodEntries)
        .select()
        .eq('user_id', userId)
        .order('recorded_at', ascending: false)
        .limit(limit);
    return List<Map<String, dynamic>>.from(data as List);
  }

  // ── Assessment helpers ───────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchAssessments(
    String userId, {
    String? type,
    int limit = 20,
  }) async {
    var query = client.from(tAssessments).select().eq('user_id', userId);
    if (type != null) {
      query = query.eq('type', type);
    }
    final data =
        await query.order('completed_at', ascending: false).limit(limit);
    return List<Map<String, dynamic>>.from(data as List);
  }

  // ── Psychologist helpers ─────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchPsychologists({
    bool availableOnly = false,
  }) async {
    var query = client.from(tPsychologists).select().eq('is_active', true);
    if (availableOnly) {
      query = query.eq('is_available_now', true);
    }
    final data = await query.order('rating_average', ascending: false);
    return List<Map<String, dynamic>>.from(data as List);
  }

  // ── AI conversation helpers ──────────────────────────────────────────────────

  /// Loads the most recent AI conversation for [userId], or null if none.
  Future<Map<String, dynamic>?> fetchLatestConversation(String userId) => client
      .from(tAiConversations)
      .select()
      .eq('user_id', userId)
      .order('updated_at', ascending: false)
      .limit(1)
      .maybeSingle();

  Future<Map<String, dynamic>> createConversation(String userId) async {
    final data = await client
        .from(tAiConversations)
        .insert({'user_id': userId, 'messages': []})
        .select()
        .single();
    return data;
  }

  Future<void> appendMessage({
    required String conversationId,
    required List<Map<String, dynamic>> messages,
    bool crisisDetected = false,
  }) =>
      client.from(tAiConversations).update({
        'messages': messages,
        if (crisisDetected) 'crisis_detected': true,
      }).eq('id', conversationId);

  // ── Notification helpers ─────────────────────────────────────────────────────

  Future<void> markNotificationRead(String notificationId) => client
      .from(tNotificationsLog)
      .update({'read_at': DateTime.now().toIso8601String()}).eq(
          'id', notificationId);

  Future<int> fetchUnreadNotificationCount(String userId) async {
    final data = await client
        .from(tNotificationsLog)
        .select()
        .eq('user_id', userId)
        .isFilter('read_at', null)
        .count(CountOption.exact);
    return data.count;
  }

  // ── Generic helpers ──────────────────────────────────────────────────────────

  /// Soft-delete by updating a `status` column to [status].
  Future<void> updateStatus({
    required String table,
    required String id,
    required String status,
  }) =>
      client.from(table).update({'status': status}).eq('id', id);

  /// Real-time subscription helper — returns the [RealtimeChannel].
  RealtimeChannel subscribeToTable({
    required String table,
    required String event,
    required void Function(Map<String, dynamic> payload) onEvent,
    Map<String, String>? filter,
  }) {
    final channel = client.channel('public:$table');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.values.firstWhere(
        (e) => e.name == event,
        orElse: () => PostgresChangeEvent.all,
      ),
      schema: 'public',
      table: table,
      callback: (payload) => onEvent(payload.newRecord),
    );
    channel.subscribe();
    return channel;
  }
}
