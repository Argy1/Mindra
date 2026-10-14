import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/telemedicine/data/booking_rpc.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;

/// Pemetaan murni untuk jadwal dan pemesanan lewat fungsi database (lihat booking_rpc.dart). Fungsi databasenya
/// sendiri diuji di web/tests/db (Postgres sungguhan, dengan uji kesesuaian terhadap kode jadwal web).
void main() {
  group('dayWindow', () {
    test('mencakup tepat satu hari kalender perangkat, dalam UTC', () {
      final window = dayWindow(DateTime(2026, 10, 15, 13, 45));
      final from = DateTime.parse(window.from);
      final to = DateTime.parse(window.to);
      expect(from.isUtc, isTrue);
      expect(to.isUtc, isTrue);
      expect(from.toLocal(), DateTime(2026, 10, 15));
      expect(to.toLocal(), DateTime(2026, 10, 16));
      expect(to.difference(from).inHours,
          anyOf(23, 24, 25)); // 23/25 jam hanya saat pergantian jam musim
    });

    test('akhir bulan dan akhir tahun tidak meleset', () {
      expect(DateTime.parse(dayWindow(DateTime(2026, 10, 31)).to).toLocal(),
          DateTime(2026, 11, 1));
      expect(DateTime.parse(dayWindow(DateTime(2026, 12, 31)).to).toLocal(),
          DateTime(2027, 1, 1));
    });
  });

  group('slotsFromRpc', () {
    test('memetakan setiap jam menjadi slot 50 menit yang tersedia, urut waktu',
        () {
      final slots = slotsFromRpc('ps-1', [
        {'slot_at': '2026-10-15T03:00:00+00:00'},
        {'slot_at': '2026-10-15T02:00:00+00:00'},
      ]);
      expect(slots, hasLength(2));
      expect(slots.first.startTime.isBefore(slots.last.startTime), isTrue);
      expect(slots.first.psychologistId, 'ps-1');
      expect(slots.first.isAvailable, isTrue);
      expect(
          slots.first.endTime.difference(slots.first.startTime).inMinutes, 50);
      expect(slots.first.id, '2026-10-15T02:00:00+00:00');
    });

    test('jam ditampilkan menurut zona waktu perangkat (formattedTime)', () {
      final slot = slotsFromRpc('ps-1', [
        {'slot_at': '2026-10-15T02:00:00+00:00'},
      ]).single;
      final local = DateTime.utc(2026, 10, 15, 2).toLocal();
      expect(slot.formattedTime,
          '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}');
    });

    test('baris rusak dilewati, bukan menggagalkan seluruh daftar', () {
      final slots = slotsFromRpc('ps-1', [
        {'slot_at': '2026-10-15T02:00:00+00:00'},
        {'slot_at': 'bukan-tanggal'},
        {'lain': 1},
        'teks',
        null,
        {'slot_at': 12345},
      ]);
      expect(slots, hasLength(1));
    });

    test('hasil bukan daftar (null, peta) menjadi daftar kosong', () {
      expect(slotsFromRpc('ps-1', null), isEmpty);
      expect(slotsFromRpc('ps-1', {'slot_at': '2026-10-15T02:00:00+00:00'}),
          isEmpty);
      expect(slotsFromRpc('ps-1', const []), isEmpty);
    });
  });

  group('bookingErrorMessage', () {
    test('setiap token galat database punya kalimat sendiri, tanpa tanda seru',
        () {
      const tokens = [
        'slot_taken',
        'patient_busy',
        'too_soon',
        'too_far',
        'limit_reached',
        'slot_not_offered',
        'psychologist_unavailable',
        'not_signed_in',
      ];
      final messages = <String>{};
      for (final token in tokens) {
        final message = bookingErrorMessage(
            PostgrestException(message: token, code: 'P0001'));
        expect(message, isNot(bookingFallbackMessage), reason: token);
        expect(message, isNot(contains('!')), reason: token);
        expect(message, isNot(contains(token)),
            reason: 'token mentah tidak boleh bocor ke pengguna');
        messages.add(message);
      }
      expect(messages, hasLength(tokens.length),
          reason: 'kalimat tidak boleh ada yang sama');
      expect(bookingErrorMessages.keys.toSet(), tokens.toSet());
    });

    test('galat tak dikenal tidak membocorkan pesan server', () {
      final message = bookingErrorMessage(
        const PostgrestException(
            message: 'relation "x" does not exist', code: '42P01'),
      );
      expect(message, bookingFallbackMessage);
      expect(message, isNot(contains('relation')));
      expect(bookingErrorMessage(Exception('jaringan putus')),
          bookingFallbackMessage);
    });

    test('bahasa pengguna: sapaan "kamu", bukan "Anda"', () {
      for (final message in [
        ...bookingErrorMessages.values,
        bookingFallbackMessage
      ]) {
        expect(message, isNot(contains('Anda')));
      }
    });
  });

  group('bookedConsultationId', () {
    test('membaca id dari baris pertama hasil tabel, atau dari satu peta', () {
      expect(
          bookedConsultationId([
            {'id': 'abc', 'status': 'confirmed'}
          ]),
          'abc');
      expect(bookedConsultationId({'id': 'xyz'}), 'xyz');
    });

    test(
        'bentuk tak terduga menghasilkan null (pemanggil melempar galat), bukan crash',
        () {
      expect(bookedConsultationId(null), isNull);
      expect(bookedConsultationId(const []), isNull);
      expect(
          bookedConsultationId([
            {'id': 5}
          ]),
          isNull);
      expect(bookedConsultationId('abc'), isNull);
    });
  });
}
