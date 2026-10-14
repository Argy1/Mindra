class ServerException implements Exception {
  const ServerException({this.message = 'Terjadi kesalahan pada server.'});
  final String message;
  @override
  String toString() => 'ServerException: $message';
}

class NetworkException implements Exception {
  const NetworkException({this.message = 'Tidak ada koneksi internet.'});
  final String message;
  @override
  String toString() => 'NetworkException: $message';
}

class AuthException implements Exception {
  const AuthException({this.message = 'Sesi tidak valid. Silakan masuk kembali.'});
  final String message;
  @override
  String toString() => 'AuthException: $message';
}

class CacheException implements Exception {
  const CacheException({this.message = 'Gagal membaca data lokal.'});
  final String message;
  @override
  String toString() => 'CacheException: $message';
}

class PermissionException implements Exception {
  const PermissionException({this.message = 'Izin akses ditolak.'});
  final String message;
  @override
  String toString() => 'PermissionException: $message';
}

class ValidationException implements Exception {
  const ValidationException({required this.message});
  final String message;
  @override
  String toString() => 'ValidationException: $message';
}
