import '../entities/journal_entry_entity.dart';

abstract class VoiceJournalRepository {
  Future<List<VoiceJournalEntry>> getEntries(String userId, {int limit = 50});
  Future<VoiceJournalEntry> saveEntry({
    required String userId,
    required String entryId,
    required String localFilePath,
    required int durationSeconds,
    String? moodEmoji,
    String? note,
  });
  Future<String> downloadAndDecrypt(VoiceJournalEntry entry, String tempDir);
  Future<void> deleteEntry(VoiceJournalEntry entry);
}
