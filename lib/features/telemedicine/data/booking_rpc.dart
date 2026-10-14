import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;

import '../domain/entities/time_slot_entity.dart';

/// Pemetaan murni untuk pemesanan lewat fungsi database (tanpa jaringan, jadi bisa diuji).
///
/// Jadwal dan pemesanan dihitung SATU kali, di database, dan dipakai bersama aplikasi web:
///   - `psychologist_available_slots(p_psychologist, p_from, p_to)` → jam yang masih bisa dipesan;
///   - `book_consultation(p_psychologist, p_scheduled_at)` → memesan dengan penjaga bentrok.
/// Keduanya dibuat oleh migrasi `20261014000500` dan `20261014000600`. Aplikasi ini semula membaca tabel
/// `psychologist_slots` yang tidak pernah ada di database, sehingga jadwal tidak pernah tampil.

/// Lama satu sesi (menit); sama dengan fungsi database.
const int consultationSessionMinutes = 50;

/// Awal dan akhir hari kalender [date] menurut zona waktu perangkat, sebagai ISO 8601 UTC untuk RPC.
({String from, String to}) dayWindow(DateTime date) {
  final start = DateTime(date.year, date.month, date.day);
  final end = DateTime(date.year, date.month, date.day + 1);
  return (
    from: start.toUtc().toIso8601String(),
    to: end.toUtc().toIso8601String()
  );
}

/// Hasil `psychologist_available_slots` (daftar `{slot_at: ISO}`) → slot yang ditampilkan.
/// Baris yang rusak dilewati, bukan menggagalkan seluruh daftar.
List<TimeSlot> slotsFromRpc(String psychologistId, Object? data) {
  if (data is! List) return const [];
  final slots = <TimeSlot>[];
  for (final row in data) {
    if (row is! Map) continue;
    final raw = row['slot_at'];
    if (raw is! String) continue;
    final start = DateTime.tryParse(raw);
    if (start == null) continue;
    slots.add(TimeSlot(
      // Slot tidak punya id baris (dihitung, bukan disimpan); jamnya sendiri menjadi pengenal.
      id: raw,
      psychologistId: psychologistId,
      startTime: start.toLocal(),
      endTime: start
          .toLocal()
          .add(const Duration(minutes: consultationSessionMinutes)),
      isAvailable: true,
    ));
  }
  slots.sort((a, b) => a.startTime.compareTo(b.startTime));
  return slots;
}

/// Token galat `book_consultation` → kalimat untuk pengguna.
const Map<String, String> bookingErrorMessages = {
  'slot_taken': 'Jam itu baru saja dipesan orang lain. Pilih jam lain.',
  'patient_busy': 'Kamu sudah punya sesi di jam itu. Pilih jam lain.',
  'too_soon': 'Jam itu terlalu dekat. Pilih jam minimal 1 jam dari sekarang.',
  'too_far': 'Pemesanan hanya bisa sampai 30 hari ke depan.',
  'limit_reached':
      'Kamu sudah punya 3 sesi mendatang. Selesaikan atau batalkan salah satunya dulu.',
  'slot_not_offered':
      'Jam itu sudah tidak tersedia. Muat ulang jadwal lalu pilih lagi.',
  'psychologist_unavailable': 'Psikolog ini sedang tidak menerima pesanan.',
  'not_signed_in': 'Sesimu sudah berakhir. Masuk lagi lalu coba pesan.',
};

const String bookingFallbackMessage =
    'Pesanan belum berhasil. Coba lagi sebentar lagi.';

/// Kalimat untuk galat dari `book_consultation`. Pesan asli server tidak pernah ditampilkan
/// (bisa teknis dan berbahasa Inggris); token yang tidak dikenal menjadi kalimat umum.
String bookingErrorMessage(Object error) {
  if (error is PostgrestException) {
    return bookingErrorMessages[error.message] ?? bookingFallbackMessage;
  }
  return bookingFallbackMessage;
}

/// Baris pertama hasil `book_consultation` (`returns table`) → id konsultasi, atau null bila bentuknya tak terduga.
String? bookedConsultationId(Object? data) {
  if (data is List && data.isNotEmpty) {
    final first = data.first;
    if (first is Map && first['id'] is String) return first['id'] as String;
  }
  if (data is Map && data['id'] is String) return data['id'] as String;
  return null;
}
