import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mindra/core/services/companion_api_service.dart';
import 'package:mindra/features/ai_companion/domain/entities/companion_event.dart';

http.StreamedResponse sse(String body, {int status = 200}) =>
    http.StreamedResponse(
      Stream.value(utf8.encode(body)),
      status,
      headers: {'content-type': 'text/event-stream'},
    );

http.StreamedResponse json(Object body, int status) => http.StreamedResponse(
      Stream.value(utf8.encode(jsonEncode(body))),
      status,
      headers: {'content-type': 'application/json'},
    );

CompanionApiService service(
  MockClient client, {
  String baseUrl = 'https://mindra.example',
  String? token = 'header.payload.sig',
}) =>
    CompanionApiService(
      baseUrl: baseUrl,
      accessToken: () async => token,
      client: client,
    );

Future<Object?> failureOf(Stream<CompanionEvent> stream) async {
  try {
    await stream.toList();
  } catch (e) {
    return e;
  }
  return null;
}

void main() {
  group('CompanionApiService.send', () {
    test('mengirim POST ke endpoint chat dengan token sesi dan badan JSON',
        () async {
      late http.BaseRequest seen;
      String? body;
      final client = MockClient.streaming((request, stream) async {
        seen = request;
        body = await stream.bytesToString();
        return sse(
            'event: done\ndata: {"conversationId":"c","saved":true}\n\n');
      });

      await service(client, baseUrl: 'https://mindra.example/')
          .send(message: 'Halo', conversationId: 'c1')
          .toList();

      expect(seen.method, 'POST');
      expect(
          seen.url.toString(), 'https://mindra.example/api/v1/companion/chat');
      expect(seen.headers['Authorization'], 'Bearer header.payload.sig');
      expect(seen.headers['Accept'], 'text/event-stream');
      expect(seen.headers['Content-Type'], contains('application/json'));
      expect(jsonDecode(body!), {'message': 'Halo', 'conversationId': 'c1'});
    });

    test('percakapan baru: conversationId tidak dikirim sama sekali', () async {
      String? body;
      final client = MockClient.streaming((request, stream) async {
        body = await stream.bytesToString();
        return sse('');
      });
      await service(client).send(message: 'Halo').toList();
      expect(jsonDecode(body!), {'message': 'Halo'});
    });

    test('mengalirkan peristiwa sesuai urutan', () async {
      final client = MockClient.streaming((_, __) async => sse(
            'event: meta\ndata: {"conversationId":"c"}\n\n'
            'event: delta\ndata: {"text":"Hai"}\n\n'
            'event: done\ndata: {"conversationId":"c","saved":true}\n\n',
          ));
      final events = await service(client).send(message: 'x').toList();
      expect(events.map((e) => e.runtimeType),
          [CompanionMeta, CompanionDelta, CompanionDone]);
    });

    test(
        'peristiwa error di tengah aliran menjadi CompanionApiException dengan kode',
        () async {
      final client = MockClient.streaming((_, __) async => sse(
            'event: delta\ndata: {"text":"Hai"}\n\n'
            'event: error\ndata: {"code":"conflict","message":"Percakapan ini berubah dari tempat lain."}\n\n',
          ));
      final error = await failureOf(service(client).send(message: 'x'));
      expect(error, isA<CompanionApiException>());
      final e = error as CompanionApiException;
      expect(e.code, 'conflict');
      expect(e.message, contains('berubah'));
      expect(e.conversationUnusable, isFalse);
    });

    test(
        'not_found dan conversation_full membuat percakapan tidak bisa dilanjutkan',
        () async {
      for (final code in [
        'not_found',
        'conversation_full',
        'conversation_corrupt'
      ]) {
        final client = MockClient.streaming((_, __) async => sse(
              'event: error\ndata: {"code":"$code","message":"Mulai percakapan baru."}\n\n',
            ));
        final e = await failureOf(service(client).send(message: 'x'))
            as CompanionApiException;
        expect(e.conversationUnusable, isTrue, reason: code);
      }
    });

    test('tanpa token sesi: galat auth tanpa memanggil jaringan', () async {
      var called = false;
      final client = MockClient.streaming((_, __) async {
        called = true;
        return sse('');
      });
      final e = await failureOf(service(client, token: null).send(message: 'x'))
          as CompanionApiException;
      expect(e.kind, CompanionErrorKind.auth);
      expect(called, isFalse);
    });

    test(
        'alamat server kosong: Teman cerita dinyatakan belum tersedia, tanpa jaringan',
        () async {
      var called = false;
      final client = MockClient.streaming((_, __) async {
        called = true;
        return sse('');
      });
      final e =
          await failureOf(service(client, baseUrl: '  ').send(message: 'x'))
              as CompanionApiException;
      expect(e.kind, CompanionErrorKind.notConfigured);
      expect(called, isFalse);
    });

    test('galat jaringan saat menyambung dipetakan ke pesan koneksi', () async {
      final client = MockClient.streaming(
          (_, __) async => throw http.ClientException('putus'));
      final e = await failureOf(service(client).send(message: 'x'))
          as CompanionApiException;
      expect(e.kind, CompanionErrorKind.network);
      expect(e.message, contains('koneksi'));
    });

    test('koneksi putus di tengah aliran dipetakan ke galat jaringan',
        () async {
      final controller = StreamController<List<int>>();
      final client = MockClient.streaming(
          (_, __) async => http.StreamedResponse(controller.stream, 200));
      final pending = failureOf(service(client).send(message: 'x'));
      controller.add(utf8.encode('event: delta\ndata: {"text":"a"}\n\n'));
      controller.addError(http.ClientException('putus'));
      await controller.close();
      final e = await pending as CompanionApiException;
      expect(e.kind, CompanionErrorKind.network);
    });
  });

  group('galat HTTP (companionHttpException)', () {
    test('memakai pesan server bila ada, dan kode menentukan jenis', () {
      final e = companionHttpException(
        429,
        jsonEncode({
          'data': null,
          'error': {
            'code': 'rate_limited',
            'message': 'Terlalu banyak permintaan.'
          },
        }),
      );
      expect(e.kind, CompanionErrorKind.rateLimit);
      expect(e.code, 'rate_limited');
      expect(e.message, 'Terlalu banyak permintaan.');
      expect(e.statusCode, 429);
    });

    test('validasi gagal: pesan masalah pertama dipakai', () {
      final e = companionHttpException(
        422,
        jsonEncode({
          'data': null,
          'error': {
            'code': 'validation_failed',
            'message': 'Masukan tidak valid.',
            'issues': [
              {
                'path': 'message',
                'message': 'Pesan terlalu panjang. Maksimal 2000 karakter.'
              }
            ],
          },
        }),
      );
      expect(e.kind, CompanionErrorKind.invalid);
      expect(e.message, contains('Maksimal 2000'));
    });

    test('503 belum dikonfigurasi', () {
      final e = companionHttpException(
        503,
        jsonEncode({
          'data': null,
          'error': {
            'code': 'not_configured',
            'message': 'Teman cerita belum diaktifkan di server ini.'
          }
        }),
      );
      expect(e.kind, CompanionErrorKind.notConfigured);
    });

    test(
        'badan bukan JSON: pesan bawaan Indonesia sesuai jenis, tanpa membocorkan badan',
        () {
      final e401 =
          companionHttpException(401, '<html>Unauthorized secret-stuff</html>');
      expect(e401.kind, CompanionErrorKind.auth);
      expect(e401.message, contains('Masuk lagi'));
      expect(e401.message, isNot(contains('secret')));

      final e502 = companionHttpException(502, 'Bad gateway');
      expect(e502.kind, CompanionErrorKind.server);
      expect(e502.message, contains('Coba lagi'));

      final e418 = companionHttpException(418, '');
      expect(e418.kind, CompanionErrorKind.unknown);
      expect(e418.message, contains('418'));
    });

    test('jawaban HTTP bukan 200 dari send() dilempar sebagai pengecualian',
        () async {
      final client = MockClient.streaming((_, __) async => json(
            {
              'data': null,
              'error': {'code': 'unauthorized', 'message': 'Masuk dulu.'}
            },
            401,
          ));
      final e = await failureOf(service(client).send(message: 'x'))
          as CompanionApiException;
      expect(e.kind, CompanionErrorKind.auth);
      expect(e.statusCode, 401);
    });
  });
}
