import 'dart:convert';

import '../domain/entities/companion_event.dart';

final _blockEnd = RegExp(r'\r?\n\r?\n');
final _lineBreak = RegExp(r'\r?\n');

/// Membaca aliran SSE dari potongan teks (mis. `response.stream.transform(utf8.decoder)`).
///
/// Tahan terhadap potongan yang terbelah di mana saja, `\r\n`, komentar (`:`), kolom yang tidak dikenal,
/// peristiwa yang tidak dikenal, dan data yang bukan JSON (semuanya diabaikan, bukan menjatuhkan aliran).
Stream<CompanionEvent> parseCompanionSse(Stream<String> chunks) async* {
  var buffer = '';
  await for (final chunk in chunks) {
    buffer += chunk;
    while (true) {
      final match = _blockEnd.firstMatch(buffer);
      if (match == null) break;
      final block = buffer.substring(0, match.start);
      buffer = buffer.substring(match.end);
      final event = _parseBlock(block);
      if (event != null) yield event;
    }
  }
  final tail = _parseBlock(buffer);
  if (tail != null) yield tail;
}

CompanionEvent? _parseBlock(String block) {
  var name = 'message';
  final dataLines = <String>[];
  for (final line in block.split(_lineBreak)) {
    if (line.isEmpty || line.startsWith(':')) continue;
    final colon = line.indexOf(':');
    final field = colon == -1 ? line : line.substring(0, colon);
    var value = colon == -1 ? '' : line.substring(colon + 1);
    if (value.startsWith(' ')) value = value.substring(1);
    if (field == 'event') {
      name = value;
    } else if (field == 'data') {
      dataLines.add(value);
    }
  }
  if (dataLines.isEmpty) return null;

  final Object? decoded;
  try {
    decoded = jsonDecode(dataLines.join('\n'));
  } on FormatException {
    return null;
  }
  if (decoded is! Map<String, dynamic>) return null;
  final data = decoded;

  String? text(String key) {
    final value = data[key];
    return value is String ? value : null;
  }

  switch (name) {
    case 'meta':
      final id = text('conversationId');
      return id == null ? null : CompanionMeta(id);
    case 'delta':
      final piece = text('text');
      return piece == null || piece.isEmpty ? null : CompanionDelta(piece);
    case 'crisis':
      final message = text('message');
      if (message == null) return null;
      final resource = data['resource'];
      final map = resource is Map<String, dynamic> ? resource : const {};
      return CompanionCrisis(
        message: message,
        resourceName: map['name'] is String ? map['name'] as String : null,
        displayNumber: map['displayNumber'] is String
            ? map['displayNumber'] as String
            : null,
        telHref: map['telHref'] is String ? map['telHref'] as String : null,
      );
    case 'done':
      return CompanionDone(
        conversationId: text('conversationId') ?? '',
        // Hanya `true` yang berarti tersimpan: nilai hilang atau aneh dianggap belum tersimpan.
        saved: data['saved'] == true,
      );
    case 'error':
      return CompanionStreamError(
        code: text('code') ?? 'internal_error',
        message: text('message') ??
            'Teman cerita sedang tidak bisa menjawab. Coba lagi sebentar lagi.',
      );
    default:
      return null;
  }
}
