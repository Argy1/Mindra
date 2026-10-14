class SleepEntry {
  const SleepEntry({
    required this.id,
    required this.userId,
    required this.bedtime,
    required this.wakeTime,
    required this.quality,
    this.notes = '',
  });

  final String id;
  final String userId;
  final DateTime bedtime;
  final DateTime wakeTime;
  final int quality; // 1–5
  final String notes;

  Duration get duration => wakeTime.difference(bedtime);
}
