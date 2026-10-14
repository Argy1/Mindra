import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AudioEncryptionService {
  const AudioEncryptionService();

  static const _storage = FlutterSecureStorage();
  static const _keyPrefix = 'vj_enc_key_';

  Future<String> _getOrCreateKey(String userId) async {
    final storageKey = '$_keyPrefix$userId';
    final existing = await _storage.read(key: storageKey);
    if (existing != null) return existing;

    final rng = Random.secure();
    final keyBytes = Uint8List.fromList(
      List.generate(32, (_) => rng.nextInt(256)),
    );
    final keyB64 = base64Encode(keyBytes);
    await _storage.write(key: storageKey, value: keyB64);
    return keyB64;
  }

  Future<Uint8List> encrypt(Uint8List data, String userId) async {
    final keyB64 = await _getOrCreateKey(userId);
    final key = enc.Key.fromBase64(keyB64);
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final encrypted = encrypter.encryptBytes(data, iv: iv);
    // Format: 16 bytes IV | ciphertext
    final result = Uint8List(16 + encrypted.bytes.length);
    result.setRange(0, 16, iv.bytes);
    result.setRange(16, result.length, encrypted.bytes);
    return result;
  }

  Future<Uint8List> decrypt(Uint8List data, String userId) async {
    final keyB64 = await _getOrCreateKey(userId);
    final key = enc.Key.fromBase64(keyB64);
    final iv = enc.IV(Uint8List.sublistView(data, 0, 16));
    final ciphertext = enc.Encrypted(Uint8List.sublistView(data, 16));
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    return Uint8List.fromList(encrypter.decryptBytes(ciphertext, iv: iv));
  }
}
