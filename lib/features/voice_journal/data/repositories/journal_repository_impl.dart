import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../models/journal_entry_model.dart';
import '../services/audio_encryption_service.dart';

class VoiceJournalRepositoryImpl {
  VoiceJournalRepositoryImpl(this._client);
  final SupabaseClient _client;
  final _enc = const AudioEncryptionService();

  static const _bucket = 'voice-journals';
  static const _table = 'voice_journals';

  Future<List<VoiceJournalEntry>> getEntries(String userId,
      {int limit = 50}) async {
    try {
      final data = await _client
          .from(_table)
          .select()
          .eq('user_id', userId)
          .order('recorded_at', ascending: false)
          .limit(limit) as List;
      return data
          .map(
              (e) => VoiceJournalEntryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal memuat jurnal suara.', e, st);
    }
  }

  // Returns a local decrypted file path ready for playback.
  Future<String> downloadAndDecrypt(
      VoiceJournalEntry entry, String tempDir) async {
    final encrypted =
        await _client.storage.from(_bucket).download(entry.storagePath);
    final decrypted = await _enc.decrypt(encrypted, entry.userId);
    final localPath = '$tempDir/${entry.id}.aac';
    await File(localPath).writeAsBytes(decrypted);
    return localPath;
  }

  Future<VoiceJournalEntry> saveEntry({
    required String userId,
    required String entryId,
    required String localFilePath,
    required int durationSeconds,
    String? moodEmoji,
    String? note,
  }) async {
    final rawBytes = await File(localFilePath).readAsBytes();
    final encryptedBytes = await _enc.encrypt(rawBytes, userId);

    final storagePath = '$userId/$entryId.enc';
    await _client.storage.from(_bucket).uploadBinary(
        storagePath, encryptedBytes,
        fileOptions: const FileOptions(upsert: false));

    final now = DateTime.now();
    final entry = VoiceJournalEntryModel(
      id: entryId,
      userId: userId,
      storagePath: storagePath,
      durationSeconds: durationSeconds,
      moodEmoji: moodEmoji,
      note: note,
      recordedAt: now,
      createdAt: now,
    );

    await _client.from(_table).insert(entry.toJson());
    return entry;
  }

  Future<void> deleteEntry(VoiceJournalEntry entry) async {
    await _client.storage.from(_bucket).remove([entry.storagePath]);
    await _client.from(_table).delete().eq('id', entry.id);
  }
}
