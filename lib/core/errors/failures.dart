abstract class Failure {
  const Failure({required this.message});
  final String message;
}

class ServerFailure extends Failure {
  const ServerFailure({super.message = 'Terjadi kesalahan pada server.'});
}

class NetworkFailure extends Failure {
  const NetworkFailure({super.message = 'Tidak ada koneksi internet. Periksa jaringan Anda.'});
}

class AuthFailure extends Failure {
  const AuthFailure({super.message = 'Sesi tidak valid. Silakan masuk kembali.'});
}

class CacheFailure extends Failure {
  const CacheFailure({super.message = 'Gagal membaca data tersimpan.'});
}

class PermissionFailure extends Failure {
  const PermissionFailure({super.message = 'Izin akses diperlukan untuk fitur ini.'});
}

class ValidationFailure extends Failure {
  const ValidationFailure({required super.message});
}

class NotFoundFailure extends Failure {
  const NotFoundFailure({super.message = 'Data tidak ditemukan.'});
}
