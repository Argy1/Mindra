import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/ai_companion/data/companion_stream.dart';
import 'package:mindra/features/ai_companion/domain/entities/companion_event.dart';

Stream<String> chunks(List<String> parts) => Stream.fromIterable(parts);

Future<List<CompanionEvent>> parse(List<String> parts) =>
    parseCompanionSse(chunks(parts)).toList();

const _meta =
    'event: meta\ndata: {"conversationId":"11111111-1111-4111-8111-111111111111"}\n\n';
const _delta = 'event: delta\ndata: {"text":"Halo"}\n\n';

void main() {
  group('parseCompanionSse', () {
    test('membaca meta, delta berurutan, dan done', () async {
      final events = await parse([
        _meta,
        _delta,
        'event: delta\ndata: {"text":", aku di sini."}\n\n',
        'event: done\ndata: {"conversationId":"c1","messageId":"m1","saved":true}\n\n',
      ]);
      expect(events, hasLength(4));
      expect((events[0] as CompanionMeta).conversationId,
          '11111111-1111-4111-8111-111111111111');
      expect((events[1] as CompanionDelta).text, 'Halo');
      expect((events[2] as CompanionDelta).text, ', aku di sini.');
      final done = events[3] as CompanionDone;
      expect(done.conversationId, 'c1');
      expect(done.saved, isTrue);
    });

    test('potongan yang terbelah di tengah baris, kolom, atau JSON tetap utuh',
        () async {
      const whole = '$_meta$_delta';
      for (var cut = 1; cut < whole.length; cut += 7) {
        final events =
            await parse([whole.substring(0, cut), whole.substring(cut)]);
        expect(
            events.map((e) => e.runtimeType), [CompanionMeta, CompanionDelta],
            reason: 'dipotong di $cut');
      }
      // Satu karakter per potongan.
      final single = await parse(whole.split(''));
      expect(single, hasLength(2));
    });

    test('pemisah CRLF diterima', () async {
      final events = await parse([
        'event: delta\r\ndata: {"text":"a"}\r\n\r\nevent: delta\r\ndata: {"text":"b"}\r\n\r\n',
      ]);
      expect(events.map((e) => (e as CompanionDelta).text), ['a', 'b']);
    });

    test(
        'komentar, peristiwa dan kolom tak dikenal, serta data bukan JSON diabaikan',
        () async {
      final events = await parse([
        ': keep-alive\n\n',
        'event: aneh\ndata: {"x":1}\n\n',
        'event: delta\ndata: bukan json\n\n',
        'event: delta\ndata: [1,2]\n\n',
        'event: delta\nid: 7\nretry: 1000\ndata: {"text":"ok"}\n\n',
      ]);
      expect(events, hasLength(1));
      expect((events.single as CompanionDelta).text, 'ok');
    });

    test(
        'delta kosong atau tanpa teks diabaikan; peristiwa terakhir tanpa baris kosong tetap dibaca',
        () async {
      final events = await parse([
        'event: delta\ndata: {"text":""}\n\n',
        'event: delta\ndata: {"teks":"salah"}\n\n',
        'event: delta\ndata: {"text":"akhir"}',
      ]);
      expect(events.map((e) => (e as CompanionDelta).text), ['akhir']);
    });

    test('krisis: pesan tetap dan sumber bantuan terbaca; sumber boleh hilang',
        () async {
      final events = await parse([
        'event: crisis\ndata: {"messageId":"m","message":"Aku di sini bersamamu.",'
            '"resource":{"name":"Healing119.id (Kemenkes)","displayNumber":"119 ext. 8","telHref":"tel:119,8"}}\n\n',
        'event: crisis\ndata: {"message":"Tanpa sumber."}\n\n',
        'event: crisis\ndata: {"messageId":"x"}\n\n',
      ]);
      expect(events, hasLength(2));
      final first = events[0] as CompanionCrisis;
      expect(first.message, 'Aku di sini bersamamu.');
      expect(first.resourceName, 'Healing119.id (Kemenkes)');
      expect(first.displayNumber, '119 ext. 8');
      expect(first.telHref, 'tel:119,8');
      final second = events[1] as CompanionCrisis;
      expect(second.message, 'Tanpa sumber.');
      expect(second.resourceName, isNull);
    });

    test('done tanpa saved=true dianggap belum tersimpan (tidak menebak)',
        () async {
      for (final data in [
        '{"conversationId":"c"}',
        '{"conversationId":"c","saved":"true"}',
        '{"conversationId":"c","saved":false}'
      ]) {
        final events = await parse(['event: done\ndata: $data\n\n']);
        expect((events.single as CompanionDone).saved, isFalse, reason: data);
      }
    });

    test('error: kode dan pesan dibawa; nilai hilang diganti pesan aman',
        () async {
      final events = await parse([
        'event: error\ndata: {"code":"conflict","message":"Percakapan ini berubah dari tempat lain."}\n\n',
        'event: error\ndata: {}\n\n',
      ]);
      final first = events[0] as CompanionStreamError;
      expect(first.code, 'conflict');
      expect(first.message, contains('berubah'));
      final second = events[1] as CompanionStreamError;
      expect(second.code, 'internal_error');
      expect(second.message, isNotEmpty);
    });

    test('meta tanpa id diabaikan', () async {
      expect(await parse(['event: meta\ndata: {}\n\n']), isEmpty);
    });
  });
}
