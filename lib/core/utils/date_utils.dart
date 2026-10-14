import 'package:intl/intl.dart';

abstract final class MindraDateUtils {
  static final _dayMonthYear = DateFormat('d MMMM yyyy', 'id_ID');
  static final _dayMonth = DateFormat('d MMMM', 'id_ID');
  static final _time = DateFormat('HH:mm', 'id_ID');
  static final _weekdayDayMonth = DateFormat('EEEE, d MMMM', 'id_ID');
  static final _shortDate = DateFormat('dd/MM/yyyy');

  static String fullDate(DateTime d) => _dayMonthYear.format(d);
  static String dayMonth(DateTime d) => _dayMonth.format(d);
  static String time(DateTime d) => _time.format(d);
  static String weekdayFull(DateTime d) => _weekdayDayMonth.format(d).toUpperCase();
  static String shortDate(DateTime d) => _shortDate.format(d);

  static String relativeTime(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()} minggu lalu';
    return fullDate(d);
  }

  static String greeting(int hour) {
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  static bool isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static bool isToday(DateTime d) => isSameDay(d, DateTime.now());
  static bool isYesterday(DateTime d) =>
      isSameDay(d, DateTime.now().subtract(const Duration(days: 1)));

  static String durationLabel(Duration d) {
    if (d.inHours > 0) return '${d.inHours} jam ${d.inMinutes.remainder(60)} menit';
    if (d.inMinutes > 0) return '${d.inMinutes} menit';
    return '${d.inSeconds} detik';
  }
}
