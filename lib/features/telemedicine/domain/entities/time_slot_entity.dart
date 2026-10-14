class TimeSlot {
  const TimeSlot({
    required this.id,
    required this.psychologistId,
    required this.startTime,
    required this.endTime,
    required this.isAvailable,
  });

  final String id;
  final String psychologistId;
  final DateTime startTime;
  final DateTime endTime;
  final bool isAvailable;

  String get formattedTime => '${startTime.hour.toString().padLeft(2, '0')}:'
      '${startTime.minute.toString().padLeft(2, '0')}';
}
